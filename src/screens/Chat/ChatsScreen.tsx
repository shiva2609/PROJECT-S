import React, { useState, useEffect } from 'react';
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
import { getCopilotChatMessages, hasCopilotChat } from '../../services/chat/chatService';
import { getLastReadTimestamp } from '../../services/notifications/notificationService';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';
import { Colors } from '../../theme/colors';
import { listenToConversations } from '../../services/chat/MessagesAPI';
import * as UsersAPI from '../../services/users/usersService';

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

export default function ChatsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | "Group's" | 'Communities' | 'Private'>('All');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Subscribe to V2 conversations (MessagesAPI)
    const unsubscribe = listenToConversations(user.uid, async (conversations) => {
      try {
        const chatItems = await Promise.all(conversations.map(async (chat) => {
          // Find other user ID
          // V2 uses 'participants' array
          const participants = chat.participants || [];
          const otherUserId = participants.find((id: string) => id !== user.uid);

          if (!otherUserId) return null;

          // Fetch other user profile
          let otherUser = undefined;
          let username = 'User';
          let profilePhoto = undefined;

          try {
            otherUser = await UsersAPI.getUserById(otherUserId);
            // Fallback Rule: Name > Username > 'User'
            username = otherUser?.name || otherUser?.username || 'User';
            profilePhoto = otherUser?.photoUrl;
          } catch (e) {
            console.log('Error fetching user ' + otherUserId);
          }

          // Handle last message (V2 structure or V1 fallback)
          const lastMessageText = typeof chat.lastMessage === 'string'
            ? chat.lastMessage
            : chat.lastMessage?.text || 'Start a conversation';

          const lastMessageTime = chat.lastMessageAt?.toMillis?.()
            || chat.updatedAt?.toMillis?.()
            || chat.lastMessage?.createdAt?.toMillis?.()
            || Date.now();

          // Unread status calculation (Client-side logic matched with notificationService)
          const lastReadTime = await getLastReadTimestamp(user.uid, chat.id);
          const isSender = chat.lastSenderId === user.uid;

          if (chat.lastSenderId && isSender) {
            // Explicitly logged to verify fix
            // console.log(`[ChatsScreen] Chat ${chat.id} is sent by ME. Force READ.`);
          }

          // Force read if I am the sender, otherwise check timestamps
          const isUnread = !isSender && (lastMessageTime > lastReadTime);

          const item: ChatListItem = {
            id: chat.id,
            userId: otherUserId,
            username,
            profilePhoto,
            lastMessage: lastMessageText,
            lastMessageTime,
            unreadCount: isUnread ? 1 : 0, // Simplified count
            isTyping: false,
            isUnread
          };
          return item;
        }));


        const validChats = chatItems.filter((i): i is ChatListItem => i !== null);

        // Add Sanchari Copilot chat if it exists (Preserve existing logic)
        const hasCopilot = await hasCopilotChat(user.uid);
        if (hasCopilot) {
          try {
            const copilotMessages = await getCopilotChatMessages(user.uid);
            if (copilotMessages.length > 0) {
              const lastCopilotMessage: any = copilotMessages[0];
              const lastReadTime = await getLastReadTimestamp(user.uid, 'sanchari-copilot');
              const lastMessageTime = lastCopilotMessage?.timestamp || Date.now();
              const isUnread = lastMessageTime > lastReadTime;

              validChats.push({
                id: 'sanchari-copilot', // Special ID
                userId: 'sanchari-copilot',
                username: 'Sanchari Copilot',
                profilePhoto: undefined,
                lastMessage: lastCopilotMessage?.text || 'Your saved itinerary',
                lastMessageTime,
                unreadCount: isUnread ? 1 : 0,
                isTyping: false,
                isUnread,
              });
            }
          } catch (e) {
            console.error('Error fetching copilot:', e);
          }
        }

        // Sort by last message time
        validChats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        setChats(validChats);
        setLoading(false);
      } catch (error) {
        console.error('Error processing chats:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredChats = chats.filter((chat) => {
    if (searchQuery.trim()) {
      return chat.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderChatItem = ({ item, index }: { item: ChatListItem; index: number }) => {
    const isAlternate = index % 2 === 0 && !item.isUnread;
    const isPlaceholder = item.lastMessage === 'Start a conversation';

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          item.isUnread && styles.chatItemUnread,
          isAlternate && styles.chatItemAlternate,
        ]}
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#757574" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#757574"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Segmented Control */}
      <View style={styles.tabContainer}>
        {(['All', "Group's", 'Communities', 'Private'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E87A5D" />
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="chatbubbles-outline" size={64} color="#757574" />
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation with a traveler!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
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
    backgroundColor: '#F8F5F1', // Neutral-50
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C3C3B', // Neutral-900
    fontFamily: 'System',
  },
  settingsButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
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
    color: '#3C3C3B',
    fontFamily: 'System',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FF5C0233', // Tertiary Light (20% opacity)
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 2,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FF5C02', // Brand Coral
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C3C3B',
    fontFamily: 'System',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  chatItemAlternate: {
    backgroundColor: '#FF5C0233', // Light coral background (20% opacity)
  },
  chatItemUnread: {
    backgroundColor: '#FF5C0215', // Very light orange for unread (8% opacity)
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E87A5D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
  },
  chatContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C3C3B',
    marginBottom: 4,
    fontFamily: 'System',
  },
  chatNameUnread: {
    fontWeight: '800',
    color: Colors.black.primary,
  },
  chatMessage: {
    fontSize: 14,
    color: '#757574',
    fontFamily: 'System',
  },
  chatMessageUnread: {
    color: Colors.black.secondary,
    fontWeight: '500',
  },
  typingText: {
    fontStyle: 'italic',
    color: '#757574',
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E87A5D', // Brand Coral
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

