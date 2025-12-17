import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import { getCopilotChatMessages, hasCopilotChat } from '../../services/chat/chatService'; // Keep for now
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';
import { Colors } from '../../theme/colors';
import { listenToConversations } from '../../services/chat/MessagesAPI';
import * as UsersAPI from '../../services/users/usersService';
import { collection, onSnapshot } from '../../core/firebase/compat';
import { db } from '../../core/firebase';

interface ChatListItem {
  id: string; // chatId
  userId: string; // other user id
  username: string;
  profilePhoto?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  isTyping?: boolean;
  isUnread?: boolean;
}

// Component to render chat avatar with unified profile photo hook
function ChatListItemAvatar({ userId, username }: { userId: string; username: string }) {
  const profilePhoto = useProfilePhoto(userId);
  if (isDefaultProfilePhoto(profilePhoto)) {
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: profilePhoto }}
      defaultSource={{ uri: getDefaultProfilePhoto() }}
      onError={() => { }}
      style={styles.avatar}
      resizeMode="cover"
    />
  );
}

/**
 * ============================================================================
 * INBOX & READ SYNC ARCHITECTURE (FINAL V1)
 * ============================================================================
 * 
 * 1. FIRESTORE PERSISTENCE (MANDATORY)
 *    - Inbox MUST load instantly from local cache (IndexedDB).
 *    - No spinners allowed after first install.
 *    - We use `persistentLocalCache` in `core/firebase/firestore.ts`.
 * 
 * 2. CACHE-FIRST STRATEGY
 *    - `ChatsScreen` initializes `loading=false` (or handles empty state gracefully).
 *    - `onSnapshot` delivers cached data immediately.
 *    - "Spinner" is only valid if cache is empty AND we are waiting for first fetch.
 * 
 * 3. REAL-TIME READ / UNREAD SYNC
 *    - Read status is STATE-BASED: (lastMessageAt > lastReadAt)
 *    - `ChatRoom` updates `users/{uid}/lastRead/{chatId}` on open/update.
 *    - `ChatsScreen` listens to `users/{uid}/lastRead` collection.
 *    - This ensures Inbox updates instantly when ChatRoom is opened.
 * 
 * 4. BADGE LOGIC
 *    - Badges are derived purely from calculated unread counts.
 *    - We do NOT store "unreadCount" in the user document to avoid de-sync.
 *    - `notificationService` and `ChatsScreen` share the same derivation logic.
 */

// MODULE-LEVEL CACHE (Persists as long as app is alive)
// This prevents spinner on re-navigation to ChatsScreen
const globalCachedChats: { [chatId: string]: ChatListItem } = {};

export default function ChatsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Raw data from listeners
  const [rawConversations, setRawConversations] = useState<any[]>([]);
  const [lastReads, setLastReads] = useState<{ [chatId: string]: number }>({});


  useEffect(() => {
    // 1. Listen to Conversations (V2)
    if (!user?.uid) {
      setInitialized(true);
      return;
    }

    const unsubscribe = listenToConversations(user.uid, (conversations) => {
      setRawConversations(conversations);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // 2. Listen to Last Read Timestamps (Instant Unread Updates)
  useEffect(() => {
    if (!user?.uid) return;

    try {
      const lastReadRef = collection(db, 'users', user.uid, 'lastRead');
      const unsubscribe = onSnapshot(lastReadRef, (snapshot) => {
        const reads: { [key: string]: number } = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          reads[doc.id] = data.lastReadAt || data.timestamp?.toMillis?.() || 0;
        });
        setLastReads(reads);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Error listening to lastReads", e);
    }
  }, [user?.uid]);

  // 3. Derive Chat List View Model
  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;

    const deriveChats = async () => {
      // OPTIMIZATION: If we have cached chats, show them immediately while updating
      // This prevents "spinner flicker" on updates
      if (Object.keys(globalCachedChats).length > 0 && chats.length === 0) {
        // Hydrate from cache immediately if state is empty
        const cachedList = Object.values(globalCachedChats)
          .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        setChats(cachedList);
        setInitialized(true);
      }

      try {
        const chatItems = await Promise.all(rawConversations.map(async (chat) => {
          // Find other user ID
          const participants = chat.participants || [];
          const otherUserId = participants.find((id: string) => id !== user.uid);

          if (!otherUserId) return null;

          // Check memory cache first for user profile
          // But we always want to fetch fresh data eventually
          // For now, simple fetch
          let otherUser = undefined;
          let username = 'User';
          let profilePhoto = undefined;

          // Optimization: If we have this chat in cache, use its username/photo as placeholder
          // while fetching fresh data
          const cachedItem = globalCachedChats[chat.id];
          if (cachedItem) {
            username = cachedItem.username;
            profilePhoto = cachedItem.profilePhoto;
          }

          try {
            // This is the bottleneck. Ideally UsersAPI should dedupe requests.
            otherUser = await UsersAPI.getUserById(otherUserId);
            if (otherUser) {
              username = otherUser.name || otherUser.username || 'User';
              profilePhoto = otherUser.photoUrl;
            }
          } catch (e) {
            // Keep cached values if fetch fails
          }

          // Handle last message
          const lastMessageText = typeof chat.lastMessage === 'string'
            ? chat.lastMessage
            : chat.lastMessage?.text || 'Start a conversation';

          const lastMessageTime = chat.lastMessageAt?.toMillis?.()
            || chat.updatedAt?.toMillis?.()
            || chat.lastMessage?.createdAt?.toMillis?.()
            || Date.now();

          // Unread Logic
          const isSender = chat.lastSenderId === user.uid;
          const lastReadTime = lastReads[chat.id] || 0;
          const isUnread = !isSender && (lastMessageTime > lastReadTime);

          const item: ChatListItem = {
            id: chat.id,
            userId: otherUserId,
            username,
            profilePhoto,
            lastMessage: lastMessageText,
            lastMessageTime,
            unreadCount: isUnread ? 1 : 0,
            isTyping: false,
            isUnread
          };

          // Update Cache
          globalCachedChats[chat.id] = item;
          return item;
        }));

        const validChats = chatItems.filter((i): i is ChatListItem => i !== null);

        // --- Copilot Logic (Preserved) ---
        // ... (Copilot logic remains same) ...
        try {
          const hasCopilot = await hasCopilotChat(user.uid);
          if (hasCopilot) {
            // ... logic same as before ...
            // We can just re-use the existing loop or minimal fetch
            // For brevity, keeping it simple:
            const copilotMessages = await getCopilotChatMessages(user.uid);
            if (copilotMessages.length > 0) {
              const lastCopilotMessage: any = copilotMessages[0];
              const lastMessageTime = lastCopilotMessage?.timestamp || Date.now();
              const copilotReadTime = lastReads['sanchari-copilot'] || 0;
              const isUnread = lastMessageTime > copilotReadTime;

              const copilotItem: ChatListItem = {
                id: 'sanchari-copilot',
                userId: 'sanchari-copilot',
                username: 'Sanchari Copilot',
                profilePhoto: undefined,
                lastMessage: lastCopilotMessage?.text || 'Your saved itinerary',
                lastMessageTime,
                unreadCount: isUnread ? 1 : 0,
                isTyping: false,
                isUnread,
              };
              validChats.push(copilotItem);
              globalCachedChats['sanchari-copilot'] = copilotItem;
            }
          }
        } catch (e) {
          console.error('Error fetching copilot:', e);
        }
        // --------------------------------

        validChats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        if (isMounted) {
          setChats(validChats);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error processing chats:', error);
        if (isMounted) setInitialized(true);
      }
    };

    deriveChats();

    return () => { isMounted = false; };
  }, [user?.uid, rawConversations, lastReads]); // Re-run when data or reads change

  const filteredChats = chats.filter((chat) => {
    if (searchQuery.trim()) {
      return chat.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const renderChatItem = ({ item, index }: { item: ChatListItem; index: number }) => {
    const isPlaceholder = item.lastMessage === 'Start a conversation';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={async () => {
          if (item.userId === 'sanchari-copilot') {
            navigation.navigate('Messaging', {
              userId: 'sanchari-copilot',
              username: 'Sanchari Copilot',
              profilePhoto: undefined,
              isCopilot: true,
            });
          } else {
            // V1 Navigation to ChatRoom
            navigation.navigate('ChatRoom', {
              chatId: item.id,
            });
          }
        }}
        activeOpacity={0.7}
      >
        {item.userId === 'sanchari-copilot' ? (
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#FF5C02' }]}>
            <Icon name="compass-outline" size={24} color="#FFFFFF" />
          </View>
        ) : (
          <ChatListItemAvatar userId={item.userId} username={item.username} />
        )}

        <View style={styles.chatContent}>
          <Text style={[styles.chatName, item.isUnread && styles.chatNameUnread]}>
            {item.username}
          </Text>
          <Text
            style={[
              styles.chatMessage,
              item.isUnread && styles.chatMessageUnread,
              isPlaceholder && { fontStyle: 'italic', color: Colors.brand.primary }
            ]}
            numberOfLines={1}
          >
            {item.isTyping ? (
              <Text style={styles.typingText}>Typing...</Text>
            ) : (
              item.lastMessage || 'No messages yet'
            )}
          </Text>
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <View style={styles.backButtonCircle}>
            <Icon name="arrow-back" size={20} color="#3C3C3B" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Icon name="settings-outline" size={24} color="#3C3C3B" />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      {!initialized && chats.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E87A5D" />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="chatbubbles-outline" size={64} color="#757574" />
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation with a traveler!</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F1', // Light grey to show off white cards
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'System',
  },
  settingsButton: {
    padding: 4,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 16, // Add top padding for first card
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20, // Smooth rounded corners
    marginBottom: 12,
    // Soft Shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E87A5D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
  },
  chatContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600', // Semi-bold for read
    color: '#3C3C3B',
    marginBottom: 4,
    fontFamily: 'System',
  },
  chatNameUnread: {
    fontWeight: '800', // Bold for unread
    color: '#000000',
  },
  chatMessage: {
    fontSize: 14,
    color: '#8E8E8E', // Muted text for read
    fontFamily: 'System',
  },
  chatMessageUnread: {
    color: '#3C3C3B', // Darker text for unread
    fontWeight: '600',
  },
  typingText: {
    fontStyle: 'italic',
    color: '#757574',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FF5C02', // Brand Coral
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C3C3B',
    marginTop: 16,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757574',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
});

