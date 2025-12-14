import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
// Removed unused imports
import MessageBubble from '../../components/chat/MessageBubble';
import MediaPicker from '../../components/create/MediaPicker';
import GlassHeader from '../../components/layout/GlassHeader';
import UserAvatar from '../../components/user/UserAvatar';
import { Colors } from '../../theme/colors';
// Removed unused MessagesAPI import
import { getOrCreateChat, sendMessage, listenToChat, markMessageSeen, Message } from '../../features/messages/services';

interface ChatRoomScreenProps {
  navigation: any;
  route: any;
}

/**
 * Chat Room Screen
 * 
 * NAVIGATION CONTRACT:
 * - Requires: { chatId: string }
 * - No other params needed
 * 
 * Displays messages using V1 Message Service.
 */
export default function ChatRoomScreen({ navigation, route }: ChatRoomScreenProps) {
  const { user } = useAuth();

  // ENFORCE SINGLE NAVIGATION CONTRACT: Only chatId is required
  const chatId = route?.params?.chatId;

  // Validate chatId exists
  if (!chatId) {
    if (__DEV__) {
      console.error('ChatRoomScreen missing chatId');
    }
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Icon name="alert-circle-outline" size={64} color={Colors.black.qua} />
          <Text style={styles.emptyText}>Invalid Chat</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            <Text style={{ color: Colors.brand.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Extract other user ID (format: "userId1_userId2")
  const [userId1, userId2] = chatId.split('_');
  const otherUserId = userId1 === user?.uid ? userId2 : userId1;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUserData, setOtherUserData] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch other user data
  useEffect(() => {
    if (otherUserId) {
      import('../../services/users/usersService').then(async (UsersAPI) => {
        try {
          const userData = await UsersAPI.getUserById(otherUserId);
          setOtherUserData(userData);
        } catch (error) {
          console.error('[ChatRoom] Error fetching user data:', error);
        }
      });
    }
  }, [otherUserId]);

  // 2. Listen to Chat (V1 Service)
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = listenToChat(chatId, (newMessages) => {
      // Reverse messages for Inverted FlatList (Newest at index 0)
      setMessages(newMessages.reverse());
      setLoading(false);

      // 3. Mark unseen messages as seen (V1 "Seen" Logic)
      if (user?.uid) {
        newMessages.forEach(msg => {
          // If message is from other user and I haven't seen it yet
          if (msg.senderId !== user.uid && !msg.seenBy?.includes(user.uid)) {
            markMessageSeen(chatId, msg.id, user.uid)
              .catch(err => console.error('Failed to mark seen:', err));
          }
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, user?.uid]);

  // 4. Send Message (V1 Service)
  const handleSendText = useCallback(async () => {
    if (!messageText.trim() || !user?.uid || !chatId) return;

    const text = messageText.trim();
    setMessageText(''); // Optimistic clear

    // Optimistic Update
    const tempId = `temp_${Date.now()}`;
    const tempMessage: any = {
      id: tempId,
      text,
      senderId: user.uid,
      createdAt: { toMillis: () => Date.now() }, // Mock Timestamp
      seenBy: [user.uid]
    };

    setMessages(prev => [tempMessage, ...prev]); // Add to start (Bottom of inverted list)

    try {
      await sendMessage(chatId, user.uid, text);
      // Listener will sync real data shortly
    } catch (error: any) {
      console.error('[ChatRoom] Send error:', error);
      Alert.alert('Error', 'Failed to send message');
      setMessageText(text); // Restore on error
      // Remove temp message
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }, [messageText, chatId, user?.uid]);

  const handlePickImage = useCallback(async () => {
    // TODO: Integrate with useMediaManager
    Alert.alert('Info', 'Image picker will be integrated with useMediaManager');
  }, []);

  const handlePickVideo = useCallback(async () => {
    // TODO: Integrate with useMediaManager
    Alert.alert('Info', 'Video picker will be integrated with useMediaManager');
  }, []);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isSent = item.senderId === user?.uid;
    const type = isSent ? 'sent' : 'received';
    const timestamp = item.createdAt?.toMillis ? item.createdAt.toMillis() : Date.now();

    return (
      <MessageBubble
        type={type}
        text={item.text}
        imageUri={item.imageUri}
        videoUri={item.videoUri}
        timestamp={timestamp}
      />
    );
  }, [user?.uid]);

  // Fallback Rule: Name > Username > 'User'
  const username = otherUserData?.name || otherUserData?.username || 'User';
  const avatarUri = otherUserData?.photoUrl;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GlassHeader
        title={username}
        showBack={true}
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: 'call-outline',
            onPress: () => Alert.alert('Info', 'Call feature coming soon'),
          },
          {
            icon: 'videocam-outline',
            onPress: () => Alert.alert('Info', 'Video call feature coming soon'),
          },
        ]}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="chatbubbles-outline" size={64} color={Colors.black.qua} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start your first conversation with {username}.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            windowSize={10}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            removeClippedSubviews
            inverted={true}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={() => { }}>
            <Icon name="add" size={24} color={Colors.black.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type your message here"
            placeholderTextColor={Colors.black.qua}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={messageText.trim() ? handleSendText : undefined}
            disabled={!messageText.trim()}
          >
            <Icon
              name={messageText.trim() ? "send" : "mic-outline"}
              size={22}
              color={messageText.trim() ? Colors.brand.primary : Colors.black.qua}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  keyboardView: {
    flex: 1,
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
    fontSize: 20,
    fontWeight: '700',
    color: Colors.black.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: Colors.black.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: Colors.white.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 4,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.black.qua,
  },
  typingDotDelay1: {
    // Animation delay handled by animation library if needed
  },
  typingDotDelay2: {
    // Animation delay handled by animation library if needed
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.primary,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.white.tertiary,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.black.primary,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white.secondary,
    borderRadius: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

