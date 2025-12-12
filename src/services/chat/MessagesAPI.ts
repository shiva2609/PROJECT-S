/**
 * Messages API
 * 
 * Handles messaging, conversations, and read receipts.
 * Messages stored in subcollections for scalability.
 */

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  startAfter,
  serverTimestamp,
  writeBatch,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../auth/authService';
import { retryWithBackoff } from '../../utils/retry';
import { normalizeMessage as normalizeMessageGlobal } from '../../utils/normalize/normalizeMessage';

// ---------- Types ----------

export interface Message {
  id: string;
  from: string;
  to: string[];
  text?: string;
  mediaUrl?: string;
  type: 'text' | 'image' | 'video';
  createdAt: any;
  delivered?: boolean;
  read?: boolean;
}

interface PaginationOptions {
  limit?: number;
  lastDoc?: any;
}

interface PaginationResult<T> {
  messages: T[];
  nextCursor?: any;
}

interface ConversationResult {
  conversations: any[];
  nextCursor?: any;
}

// ---------- Helper Functions ----------

function normalizeMessage(docSnap: DocumentSnapshot | any): Message {
  // Use global normalizer for safe defaults
  const normalized = normalizeMessageGlobal(docSnap);
  if (!normalized) {
    // Fallback to basic structure if normalization fails
    const data = docSnap.data ? docSnap.data() : docSnap;
    return {
      id: docSnap.id || '',
      from: data.from || '',
      to: Array.isArray(data.to) ? data.to : [],
      text: data.text || '',
      mediaUrl: data.mediaUrl || '',
      type: (data.type === 'image' || data.type === 'video') ? data.type : 'text',
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
      delivered: data.delivered === true,
      read: data.read === true,
    };
  }
  
  return {
    id: normalized.id,
    from: normalized.from,
    to: normalized.to,
    text: normalized.text || '',
    mediaUrl: normalized.mediaUrl || '',
    type: normalized.type,
    createdAt: normalized.createdAt?.toMillis?.() || normalized.createdAt || Date.now(),
    delivered: normalized.delivered || false,
    read: normalized.read || false,
  };
}

// ---------- Exported Functions ----------

/**
 * Create a new conversation
 * @param participantIds - Array of participant user IDs
 * @param meta - Optional metadata (groupName, etc.)
 * @returns Conversation ID
 */
export async function createConversation(
  participantIds: string[],
  meta?: any
): Promise<{ conversationId: string }> {
  try {
    const conversationsRef = collection(db, 'conversations');
    const conversationData = {
      participants: participantIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...meta,
    };
    
    const docRef = await addDoc(conversationsRef, conversationData);
    return { conversationId: docRef.id };
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    throw { code: 'create-conversation-failed', message: 'Failed to create conversation' };
  }
}

/**
 * Send a message to a conversation
 * @param conversationId - Conversation ID
 * @param message - Message data
 * @returns Message ID
 */
export async function sendMessage(
  conversationId: string,
  message: Partial<Message>
): Promise<{ messageId: string }> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageData = {
      ...message,
      createdAt: serverTimestamp(),
      delivered: false,
      read: false,
    };
    
    const docRef = await addDoc(messagesRef, messageData);
    
    // Update conversation metadata
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      updatedAt: serverTimestamp(),
      lastMessage: message.text || 'Media',
      lastMessageAt: serverTimestamp(),
    });
    
    return { messageId: docRef.id };
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw { code: 'send-message-failed', message: 'Failed to send message' };
  }
}

/**
 * Fetch messages for a conversation
 * @param conversationId - Conversation ID
 * @param options - Pagination options
 * @returns Paginated messages
 */
export async function fetchMessages(
  conversationId: string,
  options?: PaginationOptions
): Promise<PaginationResult<Message>> {
  return retryWithBackoff(async () => {
    const limit = options?.limit || 50;
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    let q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    if (options?.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(normalizeMessage).reverse(); // Reverse to show oldest first
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return {
      messages,
      nextCursor: querySnapshot.docs.length === limit ? lastDoc : undefined,
    };
  }, {
    maxRetries: 3,
    retryableErrors: ['unavailable', 'deadline-exceeded', 'network-error'],
  }).catch((error: any) => {
    console.error('Error fetching messages:', error);
    throw { code: 'fetch-messages-failed', message: 'Failed to fetch messages' };
  });
}

/**
 * Set read receipt for a message
 * @param conversationId - Conversation ID
 * @param messageId - Message ID
 * @param userId - User ID who read the message
 */
export async function setReadReceipt(
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
      read: true,
      readAt: serverTimestamp(),
      readBy: userId,
    });
  } catch (error: any) {
    console.error('Error setting read receipt:', error);
    throw { code: 'set-read-receipt-failed', message: 'Failed to set read receipt' };
  }
}

/**
 * Set delivered receipt for a message
 * @param conversationId - Conversation ID
 * @param messageId - Message ID
 * @param userId - User ID who received the message
 */
export async function setDeliveredReceipt(
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
      delivered: true,
      deliveredAt: serverTimestamp(),
      deliveredTo: userId,
    });
  } catch (error: any) {
    console.error('Error setting delivered receipt:', error);
    throw { code: 'set-delivered-receipt-failed', message: 'Failed to set delivered receipt' };
  }
}

/**
 * Get conversations for a user
 * @param userId - User ID
 * @param options - Pagination options
 * @returns Paginated conversations
 */
export async function getConversations(
  userId: string,
  options?: PaginationOptions
): Promise<ConversationResult> {
  try {
    const limit = options?.limit || 20;
    const conversationsRef = collection(db, 'conversations');
    
    let q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
      firestoreLimit(limit)
    );
    
    if (options?.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const conversations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return {
      conversations,
      nextCursor: querySnapshot.docs.length === limit ? lastDoc : undefined,
    };
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    throw { code: 'get-conversations-failed', message: 'Failed to fetch conversations' };
  }
}

// Convenience functions for hooks
// Note: Hooks call getMessages(conversationId), sendTextMessage, sendImageMessage, sendVideoMessage
// These are wrappers around the base functions

export async function getMessages(conversationId: string): Promise<Message[]> {
  const result = await fetchMessages(conversationId);
  return result.messages;
}

// Note: These convenience functions are used by hooks
// Hooks should pass userId (from auth) and conversation participants
// For now, these are placeholders - hooks will need to be updated to pass full message data
// OR we can get userId from auth context here

export async function sendTextMessage(conversationId: string, text: string, userId?: string, participants?: string[]): Promise<Message> {
  const message = await sendMessage(conversationId, {
    text,
    type: 'text',
    from: userId || '',
    to: participants || [],
  });
  
  // Fetch the created message to return full object
  const messageRef = doc(db, 'conversations', conversationId, 'messages', message.messageId);
  const messageSnap = await getDoc(messageRef);
  return normalizeMessage(messageSnap);
}

export async function sendImageMessage(conversationId: string, uri: string, userId?: string, participants?: string[]): Promise<Message> {
  const message = await sendMessage(conversationId, {
    mediaUrl: uri,
    type: 'image',
    from: userId || '',
    to: participants || [],
  });
  
  const messageRef = doc(db, 'conversations', conversationId, 'messages', message.messageId);
  const messageSnap = await getDoc(messageRef);
  return normalizeMessage(messageSnap);
}

export async function sendVideoMessage(conversationId: string, uri: string, userId?: string, participants?: string[]): Promise<Message> {
  const message = await sendMessage(conversationId, {
    mediaUrl: uri,
    type: 'video',
    from: userId || '',
    to: participants || [],
  });
  
  const messageRef = doc(db, 'conversations', conversationId, 'messages', message.messageId);
  const messageSnap = await getDoc(messageRef);
  return normalizeMessage(messageSnap);
}

