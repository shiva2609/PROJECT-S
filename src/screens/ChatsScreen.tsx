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
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { ChatMessage } from '../api/firebaseService';

interface ChatListItem {
  id: string;
  userId: string;
  username: string;
  profilePhoto?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  isTyping?: boolean;
}

export default function ChatsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | "Group's" | 'Communities' | 'Private'>('All');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Listen to messages to build chat list
    const messagesRef = collection(db, 'messages');
    const unsubscribe = onSnapshot(
      query(messagesRef, orderBy('createdAt', 'desc')),
      async (snapshot) => {
        try {
          // Get all unique thread IDs involving current user
          const threadMap = new Map<string, ChatMessage>();
          
          snapshot.docs.forEach((doc) => {
            const msg = { id: doc.id, ...doc.data() } as ChatMessage;
            const isInvolved = msg.senderId === user.uid || msg.recipientId === user.uid;
            
            if (isInvolved) {
              const otherUserId = msg.senderId === user.uid ? msg.recipientId : msg.senderId;
              const existing = threadMap.get(otherUserId);
              
              if (!existing || msg.createdAt > existing.createdAt) {
                threadMap.set(otherUserId, msg);
              }
            }
          });

          // Build chat list items
          const chatList: ChatListItem[] = [];
          
          for (const [otherUserId, lastMessage] of threadMap.entries()) {
            // Fetch user data for the other user
            try {
              const userDocRef = doc(db, 'users', otherUserId);
              const userDoc = await getDoc(userDocRef);
              
              const userData = userDoc.data();
              const username = userData?.username || userData?.displayName || 'User';
              const profilePhoto = userData?.photoURL;
              
              chatList.push({
                id: otherUserId,
                userId: otherUserId,
                username,
                profilePhoto,
                lastMessage: lastMessage.text || 'Image',
                lastMessageTime: lastMessage.createdAt,
                unreadCount: 0, // TODO: Calculate unread count
                isTyping: false,
              });
            } catch (error) {
              console.error('Error fetching user data:', error);
              // Add with default data if user fetch fails
              chatList.push({
                id: otherUserId,
                userId: otherUserId,
                username: 'User',
                profilePhoto: undefined,
                lastMessage: lastMessage.text || 'Image',
                lastMessageTime: lastMessage.createdAt,
                unreadCount: 0,
                isTyping: false,
              });
            }
          }

          // Sort by last message time
          chatList.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
          
          setChats(chatList);
          setLoading(false);
        } catch (error) {
          console.error('Error building chat list:', error);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to messages:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

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
    const isAlternate = index % 2 === 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          isAlternate && styles.chatItemAlternate,
        ]}
        onPress={() => {
          navigation.navigate('Messaging', {
            userId: item.userId,
            username: item.username,
            profilePhoto: item.profilePhoto,
          });
        }}
        activeOpacity={0.7}
      >
        {item.profilePhoto ? (
          <Image source={{ uri: item.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        
        <View style={styles.chatContent}>
          <Text style={styles.chatName}>{item.username}</Text>
          <Text style={styles.chatMessage} numberOfLines={1}>
            {item.isTyping ? (
              <Text style={styles.typingText}>Typing...</Text>
            ) : (
              item.lastMessage || 'No messages yet'
            )}
          </Text>
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
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
  chatMessage: {
    fontSize: 14,
    color: '#757574',
    fontFamily: 'System',
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

