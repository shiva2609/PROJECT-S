/**
 * V1 Messaging Schema Service
 * 
 * LOCKED SCHEMA - DO NOT MODIFY WITHOUT VERSION BUMP
 * 
 * This service enforces the V1 messaging Firestore schema with deterministic
 * chat identity rules. All messaging operations MUST use this schema.
 * 
 * SCHEMA DEFINITION:
 * 
 * chats/{chatId}
 *   - members: string[]              // [userId1, userId2] (sorted alphabetically)
 *   - lastMessage: {
 *       text: string
 *       senderId: string
 *       createdAt: Timestamp
 *     }
 *   - updatedAt: Timestamp           // Updated on every new message
 *   - createdAt: Timestamp           // Chat creation time
 * 
 * messages/{chatId}/items/{messageId}
 *   - text: string
 *   - senderId: string
 *   - createdAt: Timestamp
 *   - seenBy: string[]               // Array of userIds who have seen this message
 * 
 * CHAT IDENTITY RULES:
 * - chatId MUST be generated using buildChatId(userId1, userId2)
 * - chatId format: "userId1_userId2" where userId1 < userId2 (alphabetically)
 * - This ensures duplicate-proof 1-on-1 conversations
 * - Same chatId is generated regardless of who initiates the conversation
 * 
 * @module features/messages/services/messagingV1
 * @version 1.0.0
 */

import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    Timestamp,
    arrayUnion,
    onSnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { buildChatId, parseChatId, getOtherUserId } from './chatIdentity';

// ---------- Types ----------

/**
 * Chat document structure
 */
export interface Chat {
    chatId: string;
    members: [string, string];
    lastMessage?: {
        text: string;
        senderId: string;
        createdAt: Timestamp;
    };
    updatedAt: Timestamp;
    createdAt: Timestamp;
}

/**
 * Message document structure
 */
export interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: Timestamp;
    seenBy: string[];
}

/**
 * Message input for sending
 */
export interface MessageInput {
    text: string;
    senderId: string;
}

// ---------- Chat Operations ----------

/**
 * Get or create a chat between two users
 * Uses deterministic chatId to prevent duplicates
 * 
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns Chat document
 */
export async function getOrCreateChat(
    userId1: string,
    userId2: string
): Promise<Chat> {
    const chatId = buildChatId(userId1, userId2);
    const chatRef = doc(db, 'chats', chatId);

    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        // Chat exists, return it
        const data = chatSnap.data();
        return {
            chatId,
            members: data.members,
            lastMessage: data.lastMessage,
            updatedAt: data.updatedAt,
            createdAt: data.createdAt,
        };
    }

    // Chat doesn't exist, create it
    const [member1, member2] = [userId1, userId2].sort();
    const now = serverTimestamp();

    const newChat: Omit<Chat, 'chatId'> = {
        members: [member1, member2],
        updatedAt: now,
        createdAt: now,
    };

    await setDoc(chatRef, newChat);

    return {
        chatId,
        ...newChat,
        updatedAt: now as Timestamp,
        createdAt: now as Timestamp,
    };
}

/**
 * Get a chat by ID
 * 
 * @param chatId - Chat ID
 * @returns Chat document or null if not found
 */
export async function getChat(chatId: string): Promise<Chat | null> {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        return null;
    }

    const data = chatSnap.data();
    return {
        chatId,
        members: data.members,
        lastMessage: data.lastMessage,
        updatedAt: data.updatedAt,
        createdAt: data.createdAt,
    };
}

/**
 * Get all chats for a user
 * 
 * @param userId - User ID
 * @returns Array of chats
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
    // Since chatId is deterministic and contains both user IDs,
    // we need to query for chats where the user is a member
    const chatsRef = collection(db, 'chats');
    const q = query(
        chatsRef,
        orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);

    // Filter chats where user is a member
    const chats: Chat[] = [];
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.members && data.members.includes(userId)) {
            chats.push({
                chatId: docSnap.id,
                members: data.members,
                lastMessage: data.lastMessage,
                updatedAt: data.updatedAt,
                createdAt: data.createdAt,
            });
        }
    });

    return chats;
}

// ---------- Message Operations ----------

/**
 * Send a message in a chat
 * Automatically updates chat's lastMessage and updatedAt
 * 
 * @param chatId - Chat ID
 * @param messageInput - Message data
 * @returns Created message
 */
export async function sendMessage(
    chatId: string,
    messageInput: MessageInput
): Promise<Message> {
    const { text, senderId } = messageInput;

    // Validate chat exists
    const chat = await getChat(chatId);
    if (!chat) {
        throw new Error('Chat not found');
    }

    // Validate sender is a member
    if (!chat.members.includes(senderId)) {
        throw new Error('Sender is not a member of this chat');
    }

    // Create message
    const messagesRef = collection(db, 'messages', chatId, 'items');
    const now = serverTimestamp();

    const messageData = {
        text,
        senderId,
        createdAt: now,
        seenBy: [senderId], // Sender has seen their own message
    };

    const messageRef = await addDoc(messagesRef, messageData);

    // Update chat's lastMessage and updatedAt
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
        lastMessage: {
            text,
            senderId,
            createdAt: now,
        },
        updatedAt: now,
    });

    return {
        id: messageRef.id,
        text,
        senderId,
        createdAt: now as Timestamp,
        seenBy: [senderId],
    };
}

/**
 * Get messages for a chat
 * 
 * @param chatId - Chat ID
 * @param limitCount - Maximum number of messages to fetch (default: 50)
 * @returns Array of messages (newest first)
 */
export async function getMessages(
    chatId: string,
    limitCount: number = 50
): Promise<Message[]> {
    const messagesRef = collection(db, 'messages', chatId, 'items');
    const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);

    const messages: Message[] = [];
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({
            id: docSnap.id,
            text: data.text,
            senderId: data.senderId,
            createdAt: data.createdAt,
            seenBy: data.seenBy || [],
        });
    });

    // Reverse to show oldest first
    return messages.reverse();
}

/**
 * Mark a message as seen by a user
 * 
 * @param chatId - Chat ID
 * @param messageId - Message ID
 * @param userId - User ID who saw the message
 */
export async function markMessageAsSeen(
    chatId: string,
    messageId: string,
    userId: string
): Promise<void> {
    const messageRef = doc(db, 'messages', chatId, 'items', messageId);

    await updateDoc(messageRef, {
        seenBy: arrayUnion(userId),
    });
}

/**
 * Mark all messages in a chat as seen by a user
 * 
 * @param chatId - Chat ID
 * @param userId - User ID who saw the messages
 */
export async function markAllMessagesAsSeen(
    chatId: string,
    userId: string
): Promise<void> {
    const messages = await getMessages(chatId);

    const updatePromises = messages
        .filter((msg) => !msg.seenBy.includes(userId))
        .map((msg) => markMessageAsSeen(chatId, msg.id, userId));

    await Promise.all(updatePromises);
}

// ---------- Real-time Listeners ----------

/**
 * Listen to messages in a chat
 * 
 * @param chatId - Chat ID
 * @param callback - Callback function called with messages array
 * @returns Unsubscribe function
 */
export function listenToMessages(
    chatId: string,
    callback: (messages: Message[]) => void
): Unsubscribe {
    const messagesRef = collection(db, 'messages', chatId, 'items');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            messages.push({
                id: docSnap.id,
                text: data.text,
                senderId: data.senderId,
                createdAt: data.createdAt,
                seenBy: data.seenBy || [],
            });
        });
        callback(messages);
    });
}

/**
 * Listen to a chat
 * 
 * @param chatId - Chat ID
 * @param callback - Callback function called with chat data
 * @returns Unsubscribe function
 */
export function listenToChat(
    chatId: string,
    callback: (chat: Chat | null) => void
): Unsubscribe {
    const chatRef = doc(db, 'chats', chatId);

    return onSnapshot(chatRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }

        const data = snapshot.data();
        callback({
            chatId,
            members: data.members,
            lastMessage: data.lastMessage,
            updatedAt: data.updatedAt,
            createdAt: data.createdAt,
        });
    });
}

/**
 * Listen to all chats for a user
 * 
 * @param userId - User ID
 * @param callback - Callback function called with chats array
 * @returns Unsubscribe function
 */
export function listenToUserChats(
    userId: string,
    callback: (chats: Chat[]) => void
): Unsubscribe {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const chats: Chat[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.members && data.members.includes(userId)) {
                chats.push({
                    chatId: docSnap.id,
                    members: data.members,
                    lastMessage: data.lastMessage,
                    updatedAt: data.updatedAt,
                    createdAt: data.createdAt,
                });
            }
        });
        callback(chats);
    });
}

// ---------- Utility Functions ----------

/**
 * Get the other user in a chat
 * 
 * @param chat - Chat document
 * @param currentUserId - Current user's ID
 * @returns Other user's ID
 */
export function getOtherUserIdFromChat(chat: Chat, currentUserId: string): string {
    return getOtherUserId(chat.chatId, currentUserId);
}

/**
 * Check if a message has been seen by a user
 * 
 * @param message - Message document
 * @param userId - User ID
 * @returns true if seen, false otherwise
 */
export function hasUserSeenMessage(message: Message, userId: string): boolean {
    return message.seenBy.includes(userId);
}

/**
 * Get unread message count for a chat
 * 
 * @param chatId - Chat ID
 * @param userId - User ID
 * @returns Number of unread messages
 */
export async function getUnreadCount(chatId: string, userId: string): Promise<number> {
    const messages = await getMessages(chatId);
    return messages.filter((msg) => !msg.seenBy.includes(userId) && msg.senderId !== userId).length;
}
