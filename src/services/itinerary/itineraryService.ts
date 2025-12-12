/**
 * Itinerary Service
 * 
 * Handles saving and retrieving itineraries from Firestore
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../auth/authService';
import { ItineraryResponse } from './generateItinerary';
import { sendItineraryToChat } from './chatService';

/**
 * Saves an itinerary to Firestore
 * 
 * @param userId - User's UID
 * @param itinerary - Itinerary response to save
 * @returns Document ID of the saved itinerary
 */
export async function saveItineraryToFirestore(
  userId: string,
  itinerary: ItineraryResponse
): Promise<string> {
  try {
    console.log('💾 Saving itinerary to Firestore for user:', userId);

    const itineraryData = {
      userId,
      userPrompt: itinerary.title, // You can store the original prompt if available
      aiResponse: itinerary,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, 'users', userId, 'itineraries'),
      itineraryData
    );

    console.log('✅ Itinerary saved successfully. Document ID:', docRef.id);

    // Also send to chat with Sanchari Copilot
    try {
      await sendItineraryToChat(userId, itinerary, docRef.id);
      console.log('✅ Itinerary sent to chat successfully');
    } catch (chatError: any) {
      console.error('⚠️ Failed to send itinerary to chat (non-critical):', chatError);
      // Don't throw - saving to itineraries is the main action
    }

    return docRef.id;
  } catch (error: any) {
    console.error('❌ Error saving itinerary to Firestore:', error);
    throw new Error('Failed to save itinerary. Please try again.');
  }
}

/**
 * Gets all saved itineraries for a user
 * 
 * @param userId - User's UID
 * @returns Array of saved itineraries
 */
export async function getUserItineraries(userId: string) {
  try {
    const { getDocs } = await import('firebase/firestore');
    const itinerariesRef = collection(db, 'users', userId, 'itineraries');
    const snapshot = await getDocs(itinerariesRef);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {
    console.error('❌ Error fetching user itineraries:', error);
    throw new Error('Failed to fetch itineraries. Please try again.');
  }
}

