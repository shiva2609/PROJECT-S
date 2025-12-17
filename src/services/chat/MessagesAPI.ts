/**
 * SYSTEM INVARIANT - MESSAGING (V2)
 * ---------------------------------
 * 1. STORAGE PATHS:
 *    - Conversations: collection('conversations')
 *      - Doc ID: provided (e.g., 'uid1_uid2') or auto-generated
 *      - Fields: participants: string[], lastMessage: string, lastMessageAt: Timestamp, updatedAt: Timestamp
 *    - Messages: collection('conversations', {chatId}, 'messages')
 *      - Doc ID: auto-generated
 *      - Fields: text, mediaUrl, type, from, to, createdAt (Timestamp), read, delivered
 *
 * 2. LISTENER LOGIC:
 *    - Inbox (ChatsScreen): filtered by `participants` array-contains userId.
 *    - ChatRoom: ordered by `createdAt` desc.
 *
 * 3. TIMESTAMP HANDLING:
 *    - Writes use `serverTimestamp()`.
 *    - Reads MUST handle `null` (local pending write), `Timestamp` object, or `number`.
 *    - UI must not crash on pending timestamps.
 *
 * 4. WRITE GUARANTEES:
 *    - Sending a message MUST ensure the parent conversation document exists.
 *    - Use setDoc(..., { merge: true }) for conversation metadata.
 * 
 * 5. UNREAD TRUTH (CRITICAL):
 *    - lastSenderId in conversation metadata is AUTHORITATIVE.
 *    - IF lastSenderId === currentUser -> Conversation is READ (regardless of timestamps).
 *    - Timestamps are ONLY checked if lastSenderId != currentUser.
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
  onSnapshot,
} from '../../core/firebase/compat';
import { db } from '../../core/firebase';
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
  // 1. Unwrap Firestore Data correctly
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id || '';

  // 2. Pass RAW DATA to global normalizer (not the snapshot object)
  const normalized = normalizeMessageGlobal({ ...data, id });

  if (normalized) {
    return {
      id: normalized.id,
      from: normalized.from,
      to: normalized.to,
      text: normalized.text || '',
      mediaUrl: normalized.mediaUrl || '',
      type: normalized.type,
      // Handle Timestamp / number / null (pending function)
      createdAt: normalized.createdAt?.toMillis?.() || normalized.createdAt || Date.now(),
      delivered: normalized.delivered || false,
      read: normalized.read || false,
    };
  }

  // Fallback (Should be unreachable if global normalizer works)
  return {
    id,
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
 * GUARANTEE: Updates parent conversation metadata (creates if missing)
 * @param conversationId - Conversation ID
 * @param message - Message data
 * @returns Message ID
 */
export async function sendMessage(
  conversationId: string,
  message: Partial<Message>
): Promise<{ messageId: string }> {
  try {
    // 1. Write the Message
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageData = {
      ...message,
      createdAt: serverTimestamp(),
      delivered: false,
      read: false,
    };

    const docRef = await addDoc(messagesRef, messageData);

    // 2. Update/Create Conversation Metadata (Self-Healing)
    const conversationRef = doc(db, 'conversations', conversationId);

    // Prepare update data
    const updateData: any = {
      updatedAt: serverTimestamp(),
      lastMessage: message.text || (message.type === 'image' ? 'Image' : 'Video'),
      lastMessageAt: serverTimestamp(),
      lastSenderId: message.from, // Critical for knowing if I sent the last message
    };

    // If participants are provided in the message, flush them to the conversation
    // This repairs "missing conversation" bugs
    if (message.to && message.from) {
      // Construct participants array from 'from' and 'to'
      // Ensure uniqueness
      const participants = Array.from(new Set([message.from, ...message.to]));
      updateData.participants = participants;
    }

    // Use setDoc with merge: true to handle both update and create scenarios
    await setDoc(conversationRef, updateData, { merge: true });

    // 3. Update Sender's Read Timestamp (PREVENT SELF-UNREAD)
    // Ensures the sender doesn't see their own sent message as "unread" in the Inbox/Badge
    const senderId = message.from;
    if (senderId) {
      const userLastReadRef = doc(db, 'users', senderId, 'lastRead', conversationId);
      await setDoc(userLastReadRef, {
        timestamp: serverTimestamp(),
        lastReadAt: Date.now(),
      }, { merge: true });
    }

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
 * Listen to conversations for a user
 * @param userId - User ID
 * @param callback - Function called with conversations array
 * @returns Unsubscribe function
 */
export function listenToConversations(
  userId: string,
  callback: (conversations: any[]) => void
): () => void {
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot: any) => {
      const conversations = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(conversations);
    },
    (error: any) => {
      console.error('Error listening to conversations:', error);
      callback([]);
    }
  );
}

/**
 * Listen to messages in a conversation
 * @param conversationId - Conversation ID
 * @param callback - Function called with messages array
 * @returns Unsubscribe function
 */
export function listenToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): () => void {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot: any) => {
      const messages = snapshot.docs.map(normalizeMessage).reverse();
      callback(messages);
    },
    (error: any) => {
      console.error('Error listening to messages:', error);
      callback([]);
    }
  );
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
    const conversations = querySnapshot.docs.map((doc: any) => ({
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

