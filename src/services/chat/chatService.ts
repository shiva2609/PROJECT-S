/**
 * Chat Service
 * 
 * Handles chat operations with Sanchari Copilot
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

const COPILOT_ID = 'sanchari-copilot';
const COPILOT_NAME = 'Sanchari Copilot';

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
 * Gets messages from user's chat with Sanchari Copilot
 */
export async function getCopilotChatMessages(userId: string) {
  try {
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

