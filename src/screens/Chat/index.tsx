import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import * as MessagesAPI from '../../services/chat/MessagesAPI';
import * as UsersAPI from '../../services/users/usersService';
import UserAvatar from '../../components/user/UserAvatar';
import GlassHeader from '../../components/layout/GlassHeader';
import { Colors } from '../../theme/colors';
import { formatTimestamp } from '../../utils/formatTimestamp';

interface ConversationItem {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  otherUser?: UsersAPI.User;
  hasMessage?: boolean; // Added optional property
}

import { listenToUserChats, Chat } from '../../features/messages/services';

/**
 * Chat List Screen
 * 
 * Displays list of conversations using V1 Message Service.
 * Real-time updates via listenToUserChats.
 */
export default function ChatListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to V1 chats
    const unsubscribe = listenToUserChats(user.uid, async (chats) => {
      // Map V1 Chats to ConversationItems
      const itemsPromises = chats.map(async (chat) => {
        // Find other user ID
        const otherUserId = chat.members.find(id => id !== user.uid);
        if (!otherUserId) return null;

        // Fetch other user profile
        let otherUser = undefined;
        try {
          otherUser = await UsersAPI.getUserById(otherUserId);
        } catch (e) {
          console.log('Error fetching user ' + otherUserId);
        }

        const lastCheck = chat.lastMessage;

        const item: ConversationItem = {
          id: chat.chatId,
          participants: chat.members,
          lastMessage: lastCheck?.text || 'Start a conversation',
          lastMessageTime: lastCheck?.createdAt?.toMillis?.() || chat.updatedAt?.toMillis?.() || Date.now(),
          unreadCount: 0,
          otherUser: otherUser || undefined,
          hasMessage: !!lastCheck
        };
        return item;
      });

      const results = await Promise.all(itemsPromises);

      // Filter nulls and sort by time desc
      const sorted = results
        .filter((i): i is ConversationItem => i !== null)
        .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

      setConversations(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredConversations = conversations.filter((conv) => {
    if (searchQuery.trim()) {
      return conv.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const renderConversationItem = useCallback(({ item }: { item: ConversationItem }) => {
    const otherUser = item.otherUser;
    const username = otherUser?.username || 'User';
    const avatarUri = otherUser?.photoUrl;

    // Check if it's an empty chat
    const isPlaceholder = item.lastMessage === 'Start a conversation';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          // SINGLE NAVIGATION CONTRACT: Only chatId is required
          navigation.navigate('ChatRoom', {
            chatId: item.id,
          });
        }}
        activeOpacity={0.7}
      >
        <UserAvatar
          size="md"
          uri={avatarUri}
          hasStoryRing={false}
          isVerified={otherUser?.isVerified}
        />
        <View style={styles.conversationContent}>
          <Text style={styles.conversationName}>{username}</Text>
          <Text
            style={[
              styles.conversationMessage,
              isPlaceholder && { fontStyle: 'italic', color: Colors.brand.primary }
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
        {item.lastMessageTime && !isPlaceholder && (
          <Text style={styles.timeText}>
            {formatTimestamp(item.lastMessageTime)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GlassHeader
        title="Chats"
        showBack={true}
        onBack={() => navigation.goBack()}
        searchMode={false}
      />

      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color={Colors.black.qua} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={Colors.black.qua}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="chatbubbles-outline" size={64} color={Colors.black.qua} />
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation with a traveler!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.conversationList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.primary,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.black.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.black.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  conversationList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: Colors.white.primary,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.black.primary,
    marginBottom: 4,
  },
  conversationMessage: {
    fontSize: 14,
    color: Colors.black.secondary,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: Colors.white.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: Colors.black.qua,
    marginLeft: 8,
  },
});

