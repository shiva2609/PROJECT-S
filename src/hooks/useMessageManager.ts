import { useState, useCallback, useRef } from 'react';
import { useSession } from '../core/session';
import * as MessagesAPI from '../services/chat/MessagesAPI';
import * as GroupsAPI from '../services/chat/GroupsAPI';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  imageUri?: string;
  videoUri?: string;
  timestamp: number;
  read: boolean;
  readAt?: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: number;
  isGroup?: boolean;
  groupName?: string;
}

interface UseMessageManagerReturn {
  conversations: Record<string, Message[]>;
  typingState: Record<string, boolean>;
  sendTextMessage: (conversationId: string, text: string) => Promise<Message>;
  sendImageMessage: (conversationId: string, uri: string) => Promise<Message>;
  sendVideoMessage: (conversationId: string, uri: string) => Promise<Message>;
  fetchMessages: (conversationId: string) => Promise<void>;
  createGroup: (userIds: string[], groupName?: string) => Promise<Conversation>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
}

/**
 * Global hook for managing messages and conversations
 * Handles optimistic updates and typing indicators
 */
export function useMessageManager(): UseMessageManagerReturn {
  const { userId } = useSession();
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [typingState, setTypingState] = useState<Record<string, boolean>>({});
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchMessages = useCallback(async (conversationId: string): Promise<void> => {
    try {
      const apiMessages = await MessagesAPI.getMessages(conversationId);
      // Normalize API messages to hook format
      const normalizedMessages: Message[] = apiMessages.map((msg: any) => ({
        id: msg.id,
        conversationId,
        senderId: msg.from,
        text: msg.text,
        imageUri: msg.type === 'image' ? msg.mediaUrl : undefined,
        videoUri: msg.type === 'video' ? msg.mediaUrl : undefined,
        timestamp: typeof msg.createdAt === 'number' ? msg.createdAt : msg.createdAt?.toMillis?.() || Date.now(),
        read: msg.read || false,
        readAt: msg.readAt,
      }));
      setConversations(prev => ({
        ...prev,
        [conversationId]: normalizedMessages,
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }, []);

  const sendTextMessage = useCallback(async (conversationId: string, text: string): Promise<Message> => {
    // Optimistic update - add message to local state immediately
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      conversationId,
      senderId: '', // Will be set by API
      text,
      timestamp: Date.now(),
      read: false,
    };

    setConversations(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), tempMessage],
    }));

    try {
      const sentMessage = await MessagesAPI.sendTextMessage(conversationId, text);

      // Replace temp message with real message
      setConversations(prev => ({
        ...prev,
        [conversationId]: [
          ...(prev[conversationId] || []).filter(msg => msg.id !== tempMessage.id),
          sentMessage,
        ],
      }));

      return sentMessage;
    } catch (error) {
      // Rollback on error
      setConversations(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(msg => msg.id !== tempMessage.id),
      }));
      console.error('Error sending text message:', error);
      throw error;
    }
  }, []);

  const sendImageMessage = useCallback(async (conversationId: string, uri: string, participants?: string[]): Promise<Message> => {
    if (!userId) {
      throw new Error('User must be authenticated to send messages');
    }

    // Optimistic update
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      conversationId,
      senderId: userId,
      imageUri: uri,
      timestamp: Date.now(),
      read: false,
    };

    setConversations(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), tempMessage],
    }));

    try {
      const apiMessage = await MessagesAPI.sendImageMessage(conversationId, uri, userId, participants);
      // Normalize API message to hook format
      const sentMessage: Message = {
        id: apiMessage.id,
        conversationId,
        senderId: apiMessage.from,
        imageUri: apiMessage.mediaUrl,
        timestamp: typeof apiMessage.createdAt === 'number' ? apiMessage.createdAt : apiMessage.createdAt?.toMillis?.() || Date.now(),
        read: apiMessage.read || false,
      };

      setConversations(prev => ({
        ...prev,
        [conversationId]: [
          ...(prev[conversationId] || []).filter(msg => msg.id !== tempMessage.id),
          sentMessage,
        ],
      }));

      return sentMessage;
    } catch (error) {
      setConversations(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(msg => msg.id !== tempMessage.id),
      }));
      console.error('Error sending image message:', error);
      throw error;
    }
  }, [userId]);

  const sendVideoMessage = useCallback(async (conversationId: string, uri: string, participants?: string[]): Promise<Message> => {
    if (!userId) {
      throw new Error('User must be authenticated to send messages');
    }

    // Optimistic update
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      conversationId,
      senderId: userId,
      videoUri: uri,
      timestamp: Date.now(),
      read: false,
    };

    setConversations(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), tempMessage],
    }));

    try {
      const apiMessage = await MessagesAPI.sendVideoMessage(conversationId, uri, userId, participants);
      // Normalize API message to hook format
      const sentMessage: Message = {
        id: apiMessage.id,
        conversationId,
        senderId: apiMessage.from,
        videoUri: apiMessage.mediaUrl,
        timestamp: typeof apiMessage.createdAt === 'number' ? apiMessage.createdAt : apiMessage.createdAt?.toMillis?.() || Date.now(),
        read: apiMessage.read || false,
      };

      setConversations(prev => ({
        ...prev,
        [conversationId]: [
          ...(prev[conversationId] || []).filter(msg => msg.id !== tempMessage.id),
          sentMessage,
        ],
      }));

      return sentMessage;
    } catch (error) {
      setConversations(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(msg => msg.id !== tempMessage.id),
      }));
      console.error('Error sending video message:', error);
      throw error;
    }
  }, [userId]);

  const createGroup = useCallback(async (userIds: string[], groupName?: string): Promise<Conversation> => {
    try {
      const conversation = await GroupsAPI.createGroup(userIds, groupName);
      return conversation;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }, []);

  const setTyping = useCallback((conversationId: string, isTyping: boolean): void => {
    // Clear existing timeout
    if (typingTimeoutsRef.current[conversationId]) {
      clearTimeout(typingTimeoutsRef.current[conversationId]);
      delete typingTimeoutsRef.current[conversationId];
    }

    setTypingState(prev => ({
      ...prev,
      [conversationId]: isTyping,
    }));

    // Auto-clear typing state after 3 seconds
    if (isTyping) {
      typingTimeoutsRef.current[conversationId] = setTimeout(() => {
        setTypingState(prev => ({
          ...prev,
          [conversationId]: false,
        }));
        delete typingTimeoutsRef.current[conversationId];
      }, 3000);
    }
  }, []);

  return {
    conversations,
    typingState,
    sendTextMessage,
    sendImageMessage,
    sendVideoMessage,
    fetchMessages,
    createGroup,
    setTyping,
  };
}

