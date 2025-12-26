import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import { listenToDirectMessages, sendMessage, ChatMessage } from '../../services/api/firebaseService';
import { collection, query, orderBy, onSnapshot } from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import { markChatAsRead } from '../../services/notifications/notificationService';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import GlassChatHeader from '../../components/chat/GlassChatHeader';
import GlassInputBar from '../../components/chat/GlassInputBar';
import SlimMessageBubble from '../../components/chat/SlimMessageBubble';

interface MessagingScreenProps {
  navigation: any;
  route: {
    params: {
      userId: string;
      username: string;
      profilePhoto?: string;
      isCopilot?: boolean;
    };
  };
}

interface CopilotMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  messageType?: string;
  text?: string;
  content?: string;
  timestamp?: number;
  createdAt?: any;
}

export default function MessagingScreen({ navigation, route }: MessagingScreenProps) {
  const { user } = useAuth();
  const { userId, username, isCopilot } = route.params;
  const profilePhoto = useProfilePhoto(isCopilot ? null : userId);

  const [messages, setMessages] = useState<(ChatMessage | CopilotMessage)[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!user || !userId) return;

    markChatAsRead(user.uid, userId);

    if (isCopilot && userId === 'sanchari-copilot') {
      const messagesRef = collection(db, 'users', user.uid, 'chats', 'sanchari-copilot', 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const copilotMessages: CopilotMessage[] = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        })) as CopilotMessage[];

        setMessages(copilotMessages);
        setLoading(false);
      }, (error: any) => {
        if (__DEV__) console.error('Error listening to copilot messages:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      const unsubscribe = listenToDirectMessages(user.uid, userId, (msgs) => {
        setMessages(msgs);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, userId, isCopilot]);

  const handleSend = async () => {
    if (!messageText.trim() || !user) return;

    if (isCopilot) {
      Alert.alert('Info', 'You can view your saved itineraries here. To create a new itinerary, use the Itinerary Builder.');
      return;
    }

    const text = messageText.trim();
    setMessageText('');

    try {
      await sendMessage({
        senderId: user.uid,
        recipientId: userId,
        text,
      });
    } catch (error) {
      if (__DEV__) console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp: number | any) => {
    let date: Date;

    if (timestamp && typeof timestamp === 'object') {
      if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
        date = new Date(timestamp.toMillis());
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date();
      }
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = new Date();
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const renderMessage = ({ item, index }: { item: ChatMessage | CopilotMessage; index: number }) => {
    const isUserMessage = item.senderId === user?.uid;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;

    let itemTimestamp: number | any = (item as ChatMessage).createdAt || (item as CopilotMessage).timestamp || Date.now();
    let nextTimestamp: number | any = nextMessage ? ((nextMessage as ChatMessage).createdAt || (nextMessage as CopilotMessage).timestamp || Date.now()) : Date.now();

    if (itemTimestamp && typeof itemTimestamp === 'object') {
      if (itemTimestamp.toMillis) {
        itemTimestamp = itemTimestamp.toMillis();
      } else if (itemTimestamp.seconds) {
        itemTimestamp = itemTimestamp.seconds * 1000;
      }
    }
    if (nextTimestamp && typeof nextTimestamp === 'object') {
      if (nextTimestamp.toMillis) {
        nextTimestamp = nextTimestamp.toMillis();
      } else if (nextTimestamp.seconds) {
        nextTimestamp = nextTimestamp.seconds * 1000;
      }
    }

    const showTimestamp = index === messages.length - 1 ||
      (Math.abs(nextTimestamp - itemTimestamp) > 300000);

    const msgText = (item as ChatMessage).text || (item as CopilotMessage).text || '';
    const timestamp = showTimestamp ? formatTime(itemTimestamp) : undefined;

    return (
      <SlimMessageBubble
        text={msgText}
        isCurrentUser={isUserMessage}
        timestamp={timestamp}
        profilePhoto={!isUserMessage ? profilePhoto : undefined}
        onProfilePress={() => {
          if (!isUserMessage && !isCopilot) {
            navigation.navigate('ProfileOptions', {
              userId,
              username,
              profilePhoto,
            });
          }
        }}
        showAvatar={!isUserMessage}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <GlassChatHeader
          username={username}
          profilePhoto={profilePhoto}
          onProfilePress={() => {
            navigation.navigate('ProfileOptions', {
              userId,
              username,
              profilePhoto,
            });
          }}
          onBackPress={() => navigation.goBack()}
          onCallPress={() => {
            // Handle call
          }}
          onVideoPress={() => {
            // Handle video call
          }}
          showCallButtons={!isCopilot}
        />

        <View style={styles.chatArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E87A5D" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Icon name="chatbubbles-outline" size={64} color="#E87A5D" />
              </View>
              <Text style={styles.emptyTitle}>
                {isCopilot ? 'No saved itineraries yet' : `No messages yet`}
              </Text>
              <Text style={styles.emptySubtext}>
                {isCopilot
                  ? 'Save an itinerary from the Itinerary Builder to see it here.'
                  : 'Start your first conversation with this traveler.'}
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              inverted={false}
            />
          )}
        </View>

        {!isCopilot && (
          <GlassInputBar
            ref={inputRef}
            value={messageText}
            onChangeText={setMessageText}
            onSend={handleSend}
            onPlusPress={() => {
              // Handle attachment
            }}
            placeholder="Type your message here"
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDE7',
  },
  keyboardView: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingTop: 2,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFEEE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    fontFamily: 'System',
  },
});
