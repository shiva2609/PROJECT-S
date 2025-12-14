/**
 * Messages Feature - Services
 * 
 * Central export point for messaging services.
 * 
 * @module features/messages/services
 */

// Pure Message Service (Core 4 functions) - Primary API
export {
    getOrCreateChat,
    sendMessage,
    listenToChat,
    listenToUserChats,
    markMessageSeen,
    type Chat,
    type Message,
} from './messageService';

// V1 Messaging Schema (Extended API) - Use specific imports if needed
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
