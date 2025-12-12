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
}

/**
 * Chat List Screen
 * 
 * Displays list of conversations using global APIs.
 * Zero Firestore code - uses MessagesAPI.
 */
export default function ChatListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { conversations: convs } = await MessagesAPI.getConversations(user.uid);

      // Fetch user data for other participants
      const conversationItems: ConversationItem[] = await Promise.all(
        convs.map(async (conv: any) => {
          const otherUserId = conv.participants?.find((id: string) => id !== user.uid);
          if (!otherUserId) return null;

          try {
            const otherUser = await UsersAPI.getUserById(otherUserId);
            return {
              id: conv.id,
              participants: conv.participants || [],
              lastMessage: conv.lastMessage || '',
              lastMessageTime: conv.updatedAt?.toMillis?.() || conv.updatedAt || Date.now(),
              unreadCount: 0, // TODO: Calculate from messages
              otherUser: otherUser || undefined,
            };
          } catch (error) {
            console.error(`Error fetching user ${otherUserId}:`, error);
            return {
              id: conv.id,
              participants: conv.participants || [],
              lastMessage: conv.lastMessage || '',
              lastMessageTime: conv.updatedAt?.toMillis?.() || conv.updatedAt || Date.now(),
              unreadCount: 0,
            };
          }
        })
      );

      setConversations(conversationItems.filter(Boolean) as ConversationItem[]);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          if (otherUser) {
            navigation.navigate('ChatRoom', {
              conversationId: item.id,
              otherUserId: otherUser.id,
              username,
              avatarUri,
            });
          }
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
          <Text style={styles.conversationMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
        {item.lastMessageTime && (
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

