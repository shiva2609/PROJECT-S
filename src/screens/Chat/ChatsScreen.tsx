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
import { listenToUserGroups, Group } from '../../services/groups/groupService';
import { SmartImage } from '../../components/common/SmartImage';

const globalCachedChats: { [chatId: string]: ChatListItemData } = {};

export default function ChatsScreen({ navigation }: any) {
  const { user } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
  
  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);

  // 1. Initialize from cache immediately for instant first-frame render
  const [chats, setChats] = useState<ChatListItemData[]>(() => {
    return Object.values(globalCachedChats)
      .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  });

  const [initialized, setInitialized] = useState(Object.keys(globalCachedChats).length > 0);
  const [rawConversations, setRawConversations] = useState<any[]>([]);
  const [lastReads, setLastReads] = useState<{ [chatId: string]: number }>({});
  const [hasReceivedSync, setHasReceivedSync] = useState(false);

  // Listen to user's conversations
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

  // Listen to user's groups
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = listenToUserGroups(user.uid, (userGroups) => {
      setGroups(userGroups);
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

  const renderGroupItem = useCallback(({ item }: { item: Group }) => (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('GroupChat', {
          groupId: item.id,
          groupName: item.name,
          groupPhotoUrl: item.photoUrl,
          memberCount: item.memberCount,
        });
      }}
      style={styles.groupItem}
    >
      <SmartImage uri={item.photoUrl} style={styles.groupAvatar} />
      <View style={styles.groupInfo}>
        <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.groupLastMessage} numberOfLines={1}>
          {item.lastMessage?.text || 'No messages yet'}
        </Text>
      </View>
      <View style={styles.groupMeta}>
        <Text style={styles.groupMemberCount}>
          {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
        </Text>
      </View>
    </TouchableOpacity>
  ), [navigation]);

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

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chats' && styles.tabActive]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>
            Chats
          </Text>
          {activeTab === 'chats' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
            Groups
          </Text>
          {activeTab === 'groups' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Chat/Group List */}
      {activeTab === 'chats' ? (
        !initialized && chats.length === 0 ? (
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
        )
      ) : (
        groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={64} color="#757574" />
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>Create a group to start chatting!</Text>
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            renderItem={renderGroupItem}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* Floating Action Button - Only show in Groups tab */}
      {activeTab === 'groups' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('SelectMembers')}
          activeOpacity={0.8}
        >
          <Icon name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    // Active tab has indicator
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999999',
  },
  tabTextActive: {
    color: '#E87A5D',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E87A5D',
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
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  groupLastMessage: {
    fontSize: 14,
    color: '#666666',
  },
  groupMeta: {
    alignItems: 'flex-end',
  },
  groupMemberCount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E87A5D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
