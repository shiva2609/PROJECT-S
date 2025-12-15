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
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/auth/authService';

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

  // Raw data from listeners
  const [rawConversations, setRawConversations] = useState<any[]>([]);
  const [lastReads, setLastReads] = useState<{ [chatId: string]: number }>({});

  // 1. Listen to Conversations (V2)
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
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
          // Prioritize lastReadAt (number) -> timestamp (Firestore) -> 0
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
      try {
        const chatItems = await Promise.all(rawConversations.map(async (chat) => {
          // Find other user ID
          const participants = chat.participants || [];
          const otherUserId = participants.find((id: string) => id !== user.uid);

          if (!otherUserId) return null;

          // Fetch other user profile
          // Note: Ideally cache this, but for V1 we fetch to ensure freshness
          let otherUser = undefined;
          let username = 'User';
          let profilePhoto = undefined;

          try {
            otherUser = await UsersAPI.getUserById(otherUserId);
            username = otherUser?.name || otherUser?.username || 'User';
            profilePhoto = otherUser?.photoUrl;
          } catch (e) {
            // console.log('Error fetching user ' + otherUserId);
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
          // A. If I am the sender -> Read
          // B. If I am NOT the sender -> Check timestamps
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
          return item;
        }));

        const validChats = chatItems.filter((i): i is ChatListItem => i !== null);

        // --- Copilot Logic (Preserved) ---
        // We can check copilot unread using the same lastReads map if it's stored there with 'sanchari-copilot' key
        try {
          const hasCopilot = await hasCopilotChat(user.uid);
          if (hasCopilot) {
            const copilotMessages = await getCopilotChatMessages(user.uid);
            if (copilotMessages.length > 0) {
              const lastCopilotMessage: any = copilotMessages[0];
              const lastMessageTime = lastCopilotMessage?.timestamp || Date.now();
              const copilotReadTime = lastReads['sanchari-copilot'] || 0;
              const isUnread = lastMessageTime > copilotReadTime;

              validChats.push({
                id: 'sanchari-copilot',
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
          }
        } catch (e) {
          console.error('Error fetching copilot:', e);
        }
        // --------------------------------

        validChats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        if (isMounted) {
          setChats(validChats);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error processing chats:', error);
        if (isMounted) setLoading(false);
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
      {loading ? (
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

