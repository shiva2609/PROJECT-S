/**
 * AI Itinerary Generation Service
 * 
 * Generates structured travel itineraries using Google Gemini API.
 * Returns a parsed JSON itinerary with day-by-day breakdown.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API Key
const GEMINI_API_KEY = 'AIzaSyB1MvjBL9wCvJ1bplAOoxV2T3gEQMdgr4Q';

export interface ItineraryDay {
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
}

export interface ItineraryResponse {
  title: string;
  summary: string;
  itinerary: {
    [key: string]: ItineraryDay; // e.g., "day1", "day2", etc.
  };
  budget?: string;
  destination?: string;
  duration?: string;
}

/**
 * Generates a travel itinerary from a user prompt
 * 
 * @param prompt - User's natural language request (e.g., "Plan a 4-day adventure trip to Bali under ₹40,000")
 * @returns Parsed itinerary response with structured day-by-day plan
 */
/**
 * List available Gemini models for the API key
 */
async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    const data = await response.json();
    if (data.models) {
      return data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
  return [];
}

export async function generateItinerary(prompt: string): Promise<ItineraryResponse> {
  try {
    console.log('🤖 Generating itinerary for prompt:', prompt);

    // First, try to get available models
    const availableModels = await getAvailableModels();
    console.log('📋 Available models:', availableModels);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Try to use an available model, or fallback to gemini-pro
    let modelName = 'gemini-pro';
    if (availableModels.length > 0) {
      // Prefer newer models if available
      const model1_5 = availableModels.find(m => m.includes('1.5'));
      const modelPro = availableModels.find(m => m.includes('pro'));
      modelName = model1_5 || modelPro || availableModels[0] || 'gemini-pro';
    }
    
    const model = genAI.getGenerativeModel({ model: modelName });
    console.log(`📡 Using model: ${modelName}`);

    // Create a detailed prompt for structured JSON output
    const systemPrompt = `You are a professional travel assistant. Analyze the user's travel request and generate a detailed, day-by-day travel itinerary in JSON format.

IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no code blocks, just pure JSON.

The JSON structure must be:
{
  "title": "A descriptive title for the itinerary (e.g., '3-Day Paris Adventure')",
  "summary": "A brief 1-2 sentence summary of the itinerary",
  "destination": "The main destination name",
  "duration": "X-day format (e.g., '3-day')",
  "budget": "Budget if mentioned (e.g., '₹40,000')",
  "itinerary": {
    "day1": {
      "title": "Day 1: [Theme] (e.g., 'Day 1: Arrival & Exploration')",
      "morning": "Detailed morning activity description",
      "afternoon": "Detailed afternoon activity description",
      "evening": "Detailed evening activity description"
    },
    "day2": {
      "title": "Day 2: [Theme]",
      "morning": "Detailed morning activity description",
      "afternoon": "Detailed afternoon activity description",
      "evening": "Detailed evening activity description"
    }
    // ... continue for all days
  }
}

Extract the number of days from the user's request. If not specified, default to 3 days.
Make the itinerary realistic, detailed, and tailored to the user's request.
Include specific activities, places to visit, and recommendations.
If budget is mentioned, consider it when suggesting activities.`;

    const fullPrompt = `${systemPrompt}\n\nUser Request: ${prompt}\n\nGenerate the itinerary now:`;

    console.log('📤 Sending request to Gemini API...');
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('📥 Received response from Gemini:', text.substring(0, 200) + '...');

    // Clean the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }

    // Parse JSON response
    const parsedResponse: ItineraryResponse = JSON.parse(cleanedText);

    // Validate and ensure required fields
    if (!parsedResponse.title) {
      parsedResponse.title = extractDestination(prompt) || "Your Travel Plan";
    }
    if (!parsedResponse.summary) {
      parsedResponse.summary = `A carefully crafted ${parsedResponse.duration || extractDuration(prompt) || "multi-day"} itinerary based on your request.`;
    }
    if (!parsedResponse.itinerary || Object.keys(parsedResponse.itinerary).length === 0) {
      throw new Error('Invalid itinerary structure from API');
    }

    // Extract metadata if not provided
    if (!parsedResponse.destination) {
      parsedResponse.destination = extractDestination(prompt);
    }
    if (!parsedResponse.duration) {
      parsedResponse.duration = extractDuration(prompt);
    }
    if (!parsedResponse.budget) {
      parsedResponse.budget = extractBudget(prompt);
    }

    console.log('✅ Itinerary generated successfully');
    return parsedResponse;
  } catch (error: any) {
    console.error('❌ Error generating itinerary:', error);
    console.error('Error details:', error.message);

    // Fallback to mock response if API fails
    console.log('⚠️ Falling back to mock itinerary...');
    const mockResponse: ItineraryResponse = {
      title: extractDestination(prompt) || "Your Travel Plan",
      summary: `A carefully crafted ${extractDuration(prompt) || "multi-day"} itinerary based on your request.`,
      itinerary: generateMockItinerary(prompt),
      budget: extractBudget(prompt),
      destination: extractDestination(prompt),
      duration: extractDuration(prompt),
    };

    return mockResponse;
  }
}

/**
 * Extract destination from prompt (simple heuristic)
 */
function extractDestination(prompt: string): string | undefined {
  const destinations = ['Bali', 'Goa', 'Paris', 'Tokyo', 'Bangkok', 'Dubai', 'Singapore'];
  const lowerPrompt = prompt.toLowerCase();
  for (const dest of destinations) {
    if (lowerPrompt.includes(dest.toLowerCase())) {
      return dest;
    }
  }
  return undefined;
}

/**
 * Extract duration from prompt
 */
function extractDuration(prompt: string): string | undefined {
  const match = prompt.match(/(\d+)\s*day/i);
  return match ? `${match[1]}-day` : undefined;
}

/**
 * Extract budget from prompt
 */
function extractBudget(prompt: string): string | undefined {
  const match = prompt.match(/₹?([\d,]+)/);
  return match ? `₹${match[1]}` : undefined;
}

/**
 * Generate mock itinerary based on prompt
 */
function generateMockItinerary(prompt: string): { [key: string]: ItineraryDay } {
  const duration = extractDuration(prompt) || "3-day";
  const days = parseInt(duration) || 3;
  const destination = extractDestination(prompt) || "destination";
  
  const itinerary: { [key: string]: ItineraryDay } = {};
  
  for (let i = 1; i <= days; i++) {
    itinerary[`day${i}`] = {
      title: `Day ${i}: ${getDayTheme(i, destination)}`,
      morning: getMorningActivity(i, destination),
      afternoon: getAfternoonActivity(i, destination),
      evening: getEveningActivity(i, destination),
    };
  }
  
  return itinerary;
}

function getDayTheme(day: number, destination: string): string {
  const themes = [
    "Arrival & Exploration",
    "Cultural Immersion",
    "Adventure & Nature",
    "Local Experiences",
    "Relaxation & Reflection",
  ];
  return themes[(day - 1) % themes.length] || "Exploration";
}

function getMorningActivity(day: number, destination: string): string {
  const activities = [
    `Arrive in ${destination} and check into accommodation`,
    `Visit historic temples and cultural sites`,
    `Early morning hike or nature walk`,
    `Explore local markets and shopping districts`,
    `Sunrise yoga or meditation session`,
  ];
  return activities[(day - 1) % activities.length] || `Morning activity in ${destination}`;
}

function getAfternoonActivity(day: number, destination: string): string {
  const activities = [
    `Explore the city center and main attractions`,
    `Enjoy local cuisine at recommended restaurants`,
    `Adventure activity: water sports or trekking`,
    `Guided tour of hidden gems`,
    `Beach time or spa relaxation`,
  ];
  return activities[(day - 1) % activities.length] || `Afternoon activity in ${destination}`;
}

function getEveningActivity(day: number, destination: string): string {
  const activities = [
    `Dinner at a local restaurant`,
    `Cultural show or traditional performance`,
    `Sunset viewing at scenic spot`,
    `Night market exploration`,
    `Farewell dinner with local specialties`,
  ];
  return activities[(day - 1) % activities.length] || `Evening activity in ${destination}`;
}

