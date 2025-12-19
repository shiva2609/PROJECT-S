/**
 * Chat Service
 * 
 * Handles sending itineraries to user's chat with Sanchari Copilot
 */

import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  orderBy
} from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import { ItineraryResponse } from '../itinerary/generateItinerary';

const COPILOT_ID = 'sanchari-copilot';
const COPILOT_NAME = 'Sanchari Copilot';

/**
 * Formats itinerary data into a readable message for chat
 */
function formatItineraryMessage(itinerary: ItineraryResponse): string {
  let message = `📍 *${itinerary.title}*\n\n`;

  if (itinerary.summary) {
    message += `${itinerary.summary}\n\n`;
  }

  const days = Object.keys(itinerary.itinerary).sort();

  for (const dayKey of days) {
    const day = itinerary.itinerary[dayKey];
    if (!day) continue;
    message += `🗓️ ${day.title}\n`;
    if (day.morning) message += `☀️ Morning: ${day.morning}\n`;
    if (day.afternoon) message += `🌇 Afternoon: ${day.afternoon}\n`;
    if (day.evening) message += `🌙 Evening: ${day.evening}\n`;
    message += `\n`;
  }

  return message.trim();
}

/**
 * Creates or updates the chat document with Sanchari Copilot
 */
async function ensureCopilotChat(userId: string): Promise<void> {
  const chatRef = doc(db, 'users', userId, 'chats', COPILOT_ID);
  const chatDoc = await getDoc(chatRef);

  if (!chatDoc.exists()) {
    await setDoc(chatRef, {
      chatWith: COPILOT_NAME,
      chatWithId: COPILOT_ID,
      type: 'system',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Created Sanchari Copilot chat');
  } else {
    // Update last activity
    await setDoc(chatRef, {
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

/**
 * Sends an itinerary as a message to user's chat with Sanchari Copilot
 * 
 * @param userId - User's UID
 * @param itinerary - Itinerary to send
 * @param itineraryId - Optional itinerary document ID
 */
export async function sendItineraryToChat(
  userId: string,
  itinerary: ItineraryResponse,
  itineraryId?: string
): Promise<string> {
  try {
    console.log('💬 Sending itinerary to chat for user:', userId);

    // Ensure chat exists
    await ensureCopilotChat(userId);

    // Format message content
    const formattedMessage = formatItineraryMessage(itinerary);

    // Create message in chat
    const messagesRef = collection(db, 'users', userId, 'chats', COPILOT_ID, 'messages');
    const messageData = {
      senderId: COPILOT_ID,
      senderName: COPILOT_NAME,
      recipientId: userId,
      messageType: 'itinerary',
      text: `Your saved itinerary — "${itinerary.title}"`,
      content: formattedMessage,
      itineraryData: itinerary, // Store full itinerary data for rendering
      itineraryId: itineraryId || null,
      createdAt: serverTimestamp(),
      timestamp: Date.now(), // For sorting
    };

    const messageRef = await addDoc(messagesRef, messageData);
    console.log('✅ Itinerary sent to chat. Message ID:', messageRef.id);

    return messageRef.id;
  } catch (error: any) {
    console.error('❌ Error sending itinerary to chat:', error);
    throw new Error('Failed to send itinerary to chat. Please try again.');
  }
}

/**
 * Gets messages from user's chat with Sanchari Copilot
 */
export async function getCopilotChatMessages(userId: string) {
  try {
    // const { getDocs, query, orderBy } = await import('firebase/firestore'); // Removed dynamic import
    const messagesRef = collection(db, 'users', userId, 'chats', COPILOT_ID, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {
    console.error('❌ Error fetching copilot chat messages:', error);
    return [];
  }
}

/**
 * Checks if user has a chat with Sanchari Copilot
 */
export async function hasCopilotChat(userId: string): Promise<boolean> {
  try {
    const chatRef = doc(db, 'users', userId, 'chats', COPILOT_ID);
    const chatDoc = await getDoc(chatRef);
    return chatDoc.exists();
  } catch (error) {
    return false;
  }
}

