/**
 * Messages Feature - Services
 * 
 * Central export point for messaging services.
 * 
 * @module features/messages/services
 */

// ❌ LEGACY messageService.ts REMOVED
// DO NOT USE: getOrCreateChat, sendMessage, listenToChat from messageService.ts
// These write to the OLD schema: chats/ + messages/{chatId}/items
// 
// ✅ USE INSTEAD: MessagesAPI from '../../services/chat/MessagesAPI'
// - getOrCreateConversation() for chat creation
// - sendMessage() for sending messages
// - listenToMessages() for message listening
// - listenToConversations() for inbox

// V1 Messaging Schema (Extended API) - Use specific imports if needed
// ❌ REMOVED: getOrCreateChat - use getOrCreateConversation from MessagesAPI instead
export {
    getChat,
    getUserChats,
    getMessages,
    markMessageAsSeen,
    markAllMessagesAsSeen,
    listenToMessages,
    getOtherUserIdFromChat,
    hasUserSeenMessage,
    getUnreadCount,
} from './messagingV1';

// Chat Identity Utilities
export * from './chatIdentity';
