/**
 * Pure Message Service
 * 
 * Stable, reusable messaging backend that fits cleanly into the existing codebase.
 * Implements ONLY the core messaging functions with strict rules enforcement.
 * 
 * RULES ENFORCED:
 * 1. getOrCreateChat guarantees ONE chat per user pair (deterministic chatId)
 * 2. sendMessage atomically writes message AND updates chat metadata
 * 3. listenToChat listens ONLY to messages subcollection
 * 4. listenToUserChats listens ONLY to chats collection
 * 5. Every listener returns an unsubscribe function
 * 6. No nested Firestore reads
 * 7. No React, hooks, navigation, or UI imports
 * 
 * @module features/messages/services/messageService
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
    onSnapshot,
    serverTimestamp,
    writeBatch,
    arrayUnion,
    Unsubscribe,
    Timestamp,
} from '../../../core/firebase/compat';
import { db } from '../../../core/firebase';
import { buildChatId } from './chatIdentity';

// ---------- Types ----------

/**
 * Chat document structure (matches V1 schema)
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
 * Message document structure (matches V1 schema)
 */
export interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: Timestamp;
    seenBy: string[];
}

// ---------- Core Functions ----------

/**
 * Get or create a chat between two users
 * 
 * GUARANTEES: ONE chat per user pair (deterministic chatId)
 * 
 * @param userA - First user ID
 * @param userB - Second user ID
 * @returns Chat document
 * 
 * @example
 * ```typescript
 * const chat = await getOrCreateChat("alice", "bob");
 * console.log(chat.chatId); // "alice_bob"
 * ```
 */
export async function getOrCreateChat(
    userA: string,
    userB: string
): Promise<Chat> {
    // Generate deterministic chatId (sorted alphabetically)
    const chatId = buildChatId(userA, userB);
    const chatRef = doc(db, 'chats', chatId);

    // Check if chat exists
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
    const [member1, member2] = [userA, userB].sort();
    const now = serverTimestamp();

    const newChatData = {
        members: [member1, member2],
        updatedAt: now,
        createdAt: now,
    };

    await setDoc(chatRef, newChatData);

    // Return the created chat
    return {
        chatId,
        members: [member1, member2] as [string, string],
        updatedAt: now as Timestamp,
        createdAt: now as Timestamp,
    };
}

/**
 * Send a message in a chat
 * 
 * ATOMICALLY:
 * 1. Writes the message to messages/{chatId}/items/{messageId}
 * 2. Updates chat.lastMessage
 * 3. Updates chat.updatedAt
 * 
 * Uses Firestore batch to ensure atomicity.
 * 
 * @param chatId - Chat ID
 * @param senderId - Sender's user ID
 * @param text - Message text
 * @returns Created message
 * 
 * @example
 * ```typescript
 * const message = await sendMessage("alice_bob", "alice", "Hello!");
 * ```
 */
export async function sendMessage(
    chatId: string,
    senderId: string,
    text: string
): Promise<Message> {
    // Validate inputs
    if (!chatId || !senderId || !text) {
        throw new Error('chatId, senderId, and text are required');
    }

    // Create batch for atomic operation
    const batch = writeBatch(db);

    // 1. Create message document
    const messagesRef = collection(db, 'messages', chatId, 'items');
    const messageRef = doc(messagesRef); // Auto-generate ID
    const now = serverTimestamp();

    const messageData = {
        text,
        senderId,
        createdAt: now,
        seenBy: [senderId], // Sender has seen their own message
    };

    batch.set(messageRef, messageData);

    // 2. Update chat's lastMessage and updatedAt
    const chatRef = doc(db, 'chats', chatId);
    const chatUpdateData = {
        lastMessage: {
            text,
            senderId,
            createdAt: now,
        },
        updatedAt: now,
    };

    batch.update(chatRef, chatUpdateData);

    // Commit batch (atomic operation)
    await batch.commit();

    // Return the created message
    return {
        id: messageRef.id,
        text,
        senderId,
        createdAt: now as Timestamp,
        seenBy: [senderId],
    };
}

/**
 * Listen to messages in a chat
 * 
 * Listens ONLY to messages/{chatId}/items subcollection.
 * No nested Firestore reads.
 * 
 * @param chatId - Chat ID
 * @param callback - Function called with messages array on updates
 * @returns Unsubscribe function to stop listening
 * 
 * @example
 * ```typescript
 * const unsubscribe = listenToChat("alice_bob", (messages) => {
 *   console.log("Messages updated:", messages);
 * });
 * 
 * // Later, cleanup
 * unsubscribe();
 * ```
 */
export function listenToChat(
    chatId: string,
    callback: (messages: Message[]) => void
): Unsubscribe {
    // Listen to messages subcollection ONLY
    const messagesRef = collection(db, 'messages', chatId, 'items');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
        q,
        (snapshot: any) => {
            const messages: Message[] = [];

            snapshot.forEach((docSnap: any) => {
                const data = docSnap.data();
                messages.push({
                    id: docSnap.id,
                    text: data.text || '',
                    senderId: data.senderId || '',
                    createdAt: data.createdAt,
                    seenBy: data.seenBy || [],
                });
            });

            callback(messages);
        },
        (error: any) => {
            console.error('[listenToChat] Error:', error);
            // Call callback with empty array on error
            callback([]);
        }
    );
}

/**
 * Listen to all chats for a user
 * 
 * Listens ONLY to chats collection.
 * Filters chats where user is a member.
 * No nested Firestore reads.
 * 
 * @param userId - User ID
 * @param callback - Function called with chats array on updates
 * @returns Unsubscribe function to stop listening
 * 
 * @example
 * ```typescript
 * const unsubscribe = listenToUserChats("alice", (chats) => {
 *   console.log("Chats updated:", chats);
 * });
 * 
 * // Later, cleanup
 * unsubscribe();
 * ```
 */
export function listenToUserChats(
    userId: string,
    callback: (chats: Chat[]) => void
): Unsubscribe {
    // Listen to chats collection ONLY
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(
        q,
        (snapshot: any) => {
            const chats: Chat[] = [];

            snapshot.forEach((docSnap: any) => {
                const data = docSnap.data();

                // Filter: only include chats where user is a member
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
        },
        (error: any) => {
            console.error('[listenToUserChats] Error:', error);
            // Call callback with empty array on error
            callback([]);
        }
    );
}

/**
 * Mark a message as seen by a user
 * 
 * Uses atomic arrayUnion to prevent race conditions.
 * Idempotent - safe to call multiple times.
 * 
 * RULES ENFORCED:
 * - Uses atomic arrayUnion on seenBy
 * - Idempotent (safe to call multiple times)
 * - Does NOT modify chat.lastMessage
 * - Does NOT trigger notifications
 * - No side effects
 * 
 * @param chatId - Chat ID
 * @param messageId - Message ID
 * @param userId - User ID who saw the message
 * 
 * @example
 * ```typescript
 * await markMessageSeen("alice_bob", "msg123", "bob");
 * // Safe to call again - no duplicate entries
 * await markMessageSeen("alice_bob", "msg123", "bob");
 * ```
 */
export async function markMessageSeen(
    chatId: string,
    messageId: string,
    userId: string
): Promise<void> {
    // Validate inputs
    if (!chatId || !messageId || !userId) {
        throw new Error('chatId, messageId, and userId are required');
    }

    // Update message's seenBy array atomically
    const messageRef = doc(db, 'messages', chatId, 'items', messageId);

    // arrayUnion ensures:
    // 1. Atomic operation (no race conditions)
    // 2. Idempotent (userId added only once, even if called multiple times)
    // 3. No side effects (only updates seenBy field)
    await updateDoc(messageRef, {
        seenBy: arrayUnion(userId),
    });
}
