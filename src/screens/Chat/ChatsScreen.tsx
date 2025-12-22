import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import { getCopilotChatMessages, hasCopilotChat } from '../../services/chat/chatService';
import { listenToConversations } from '../../services/chat/MessagesAPI';
import * as UsersAPI from '../../services/users/usersService';
import { getCachedProfilePhoto } from '../../services/users/userProfilePhotoService';
import { collection, onSnapshot } from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import ChatListItem, { ChatListItemData } from '../../components/chat/ChatListItem';

const globalCachedChats: { [chatId: string]: ChatListItemData } = {};

export default function ChatsScreen({ navigation }: any) {
  const { user } = useAuth();

  // 1. Initialize from cache immediately for instant first-frame render
  const [chats, setChats] = useState<ChatListItemData[]>(() => {
    return Object.values(globalCachedChats)
      .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  });

  const [initialized, setInitialized] = useState(Object.keys(globalCachedChats).length > 0);
  const [rawConversations, setRawConversations] = useState<any[]>([]);
  const [lastReads, setLastReads] = useState<{ [chatId: string]: number }>({});
  const [hasReceivedSync, setHasReceivedSync] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setInitialized(true);
      return;
    }
    const unsubscribe = listenToConversations(user.uid, (conversations) => {
      setRawConversations(conversations);
      setHasReceivedSync(true);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    try {
      const lastReadRef = collection(db, 'users', user.uid, 'lastRead');
      const unsubscribe = onSnapshot(lastReadRef, (snapshot: any) => {
        const reads: { [key: string]: number } = {};
        snapshot.docs.forEach((doc: any) => {
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

  useEffect(() => {
    if (!user?.uid) return;

    // If the listener hasn't even fired yet, keep showing the optimistic cache
    if (!hasReceivedSync && chats.length > 0) return;

    let isMounted = true;

    const deriveChats = async () => {
      try {
        const chatItems = await Promise.all(rawConversations.map(async (chat) => {
          const participants = chat.participants || [];
          const otherUserId = participants.find((id: string) => id !== user.uid);
          if (!otherUserId) return null;

          let username = 'User';
          let profilePhoto = undefined;

          // Faster Lookup: Memory Cache -> Ad-hoc Cache
          const memoryPhoto = getCachedProfilePhoto(otherUserId);
          const cachedItem = globalCachedChats[chat.id];

          if (memoryPhoto) {
            profilePhoto = memoryPhoto;
          } else if (cachedItem) {
            profilePhoto = cachedItem.profilePhoto;
          }

          if (cachedItem) {
            username = cachedItem.username;
          }

          // Background Refresh: Update names/photos silently
          UsersAPI.getUserById(otherUserId).then(otherUser => {
            if (otherUser && isMounted) {
              const updatedName = otherUser.name || otherUser.username || 'User';
              const updatedPhoto = otherUser.photoUrl;

              // If details changed, update the cache for next time
              if (globalCachedChats[chat.id]) {
                globalCachedChats[chat.id]!.username = updatedName;
                globalCachedChats[chat.id]!.profilePhoto = updatedPhoto;
              }
            }
          }).catch(() => { });

          const lastMessageText = typeof chat.lastMessage === 'string'
            ? chat.lastMessage
            : chat.lastMessage?.text || 'Start a conversation';

          const lastMessageTime = chat.lastMessageAt?.toMillis?.()
            || chat.updatedAt?.toMillis?.()
            || chat.lastMessage?.createdAt?.toMillis?.()
            || Date.now();

          const isSender = chat.lastSenderId === user.uid;
          const lastReadTime = lastReads[chat.id] || 0;
          const isUnread = !isSender && (lastMessageTime > lastReadTime);

          const item: ChatListItemData = {
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

          globalCachedChats[chat.id] = item;
          return item;
        }));

        const validChats = chatItems.filter((i): i is ChatListItemData => i !== null);

        // Fetch Copilot metadata (cached)
        try {
          const hasCopilot = await hasCopilotChat(user.uid);
          if (hasCopilot) {
            const copilotMessages = await getCopilotChatMessages(user.uid);
            if (copilotMessages.length > 0) {
              const lastCopilotMessage: any = copilotMessages[0];
              const lastMessageTime = lastCopilotMessage?.timestamp || Date.now();
              const copilotReadTime = lastReads['sanchari-copilot'] || 0;
              const isUnread = lastMessageTime > copilotReadTime;

              const copilotItem: ChatListItemData = {
                id: 'sanchari-copilot',
                userId: 'sanchari-copilot',
                username: 'Ask Sanchari',
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
        } catch (e) { }

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
  }, [user?.uid, rawConversations, lastReads, hasReceivedSync]);

  const handleChatPress = useCallback((item: ChatListItemData) => {
    if (item.userId === 'sanchari-copilot') {
      navigation.navigate('Messaging', {
        userId: 'sanchari-copilot',
        username: 'Ask Sanchari',
        profilePhoto: undefined,
        isCopilot: true,
      });
    } else {
      navigation.navigate('ChatRoom', {
        chatId: item.id,
        otherUserId: item.userId,
        username: item.username,
        profilePhoto: item.profilePhoto,
      });
    }
  }, [navigation]);

  const renderChatItem = useCallback(({ item }: { item: ChatListItemData }) => (
    <ChatListItem item={item} onPress={handleChatPress} />
  ), [handleChatPress]);

  const keyExtractor = useCallback((item: ChatListItemData) => item.id, []);

  // Item height: 84px (76 inner height + 8 margin bottom)
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 84,
    offset: 84 * index,
    index,
  }), []);

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
          keyExtractor={keyExtractor}
          renderItem={renderChatItem}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F1',
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
    paddingTop: 16,
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
