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
// Replaced V1 imports with V2 MessagesAPI
import { sendMessage, listenToMessages, setReadReceipt, Message } from '../../services/chat/MessagesAPI';
import { markChatAsRead } from '../../services/notifications/notificationService';

interface ChatRoomScreenProps {
  navigation: any;
  route: any;
}

/**
 * Chat Room Screen
 * 
 * Displays messages using V2 Messages API.
 */
export default function ChatRoomScreen({ navigation, route }: ChatRoomScreenProps) {
  const { user } = useAuth();
  const chatId = route?.params?.chatId;

  if (!chatId) {
    if (__DEV__) console.error('ChatRoomScreen missing chatId');
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

  const [userId1, userId2] = chatId.split('_');
  const otherUserId = userId1 === user?.uid ? userId2 : userId1;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUserData, setOtherUserData] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

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

  // Listen to Chat (V2 API)
  useEffect(() => {
    if (!chatId) return;

    // Use V2 listener with metadata changes (pending writes)
    const unsubscribe = listenToMessages(chatId, (newMessages) => {
      // With includeMetadataChanges: true, this snapshot includes local pending writes.
      // Firestore `orderBy('createdAt', 'desc')` handles pending timestamps by placing them at the top (newest).

      // Inverted FlatList requires [Newest, ..., Oldest]
      // MessagesAPI returns [Oldest, ..., Newest] (due to .reverse())
      // So we reverse it BACK to [Newest, ..., Oldest]
      const reversed = [...newMessages].reverse();

      setMessages(reversed);
      setLoading(false);

      // Updates Inbox unread state
      if (user?.uid) {
        markChatAsRead(user.uid, chatId).catch(e => console.error('Failed to mark chat read', e));
      }

      // Mark unseen messages as seen/read
      if (user?.uid) {
        newMessages.forEach(msg => {
          if (msg.from !== user.uid && !msg.read) {
            setReadReceipt(chatId, msg.id, user.uid)
              .catch(err => console.error('Failed to set read receipt:', err));
          }
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, user?.uid]);

  const handleSendText = useCallback(async () => {
    if (!messageText.trim() || !user?.uid || !chatId) return;

    const text = messageText.trim();
    setMessageText('');

    // Optimistic Update
    const tempId = `temp_${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      text,
      from: user.uid,
      to: [otherUserId],
      type: 'text',
      createdAt: Date.now(),
      read: false
    };

    setMessages(prev => [tempMessage, ...prev]);

    try {
      // V2 expects partial message object
      // MUST include to/from for conversation auto-creation
      await sendMessage(chatId, {
        text,
        type: 'text',
        from: user.uid,
        to: [otherUserId]
      });
    } catch (error: any) {
      console.error('[ChatRoom] Send error:', error);
      Alert.alert('Error', 'Failed to send message');
      setMessageText(text);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }, [messageText, chatId, user?.uid, otherUserId]);

  const handlePickImage = useCallback(async () => {
    // TODO: Integrate with useMediaManager
    Alert.alert('Info', 'Image picker will be integrated with useMediaManager');
  }, []);

  const handlePickVideo = useCallback(async () => {
    // TODO: Integrate with useMediaManager
    Alert.alert('Info', 'Video picker will be integrated with useMediaManager');
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    // Robust check for current user
    const currentUserId = user?.uid;
    const isSent = currentUserId ? item.from === currentUserId : false;
    const type = isSent ? 'sent' : 'received';

    // Handle Timestamp or number
    let timestamp = Date.now();
    if (typeof item.createdAt === 'number') {
      timestamp = item.createdAt;
    } else if (item.createdAt?.toMillis) {
      timestamp = item.createdAt.toMillis();
    }

    return (
      <MessageBubble
        type={type}
        text={item.text}
        imageUri={item.mediaUrl}
        videoUri={item.type === 'video' ? item.mediaUrl : undefined}
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
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={(text) => setMessageText(text)}
            multiline
            maxLength={1000}
          />

          {/* Send Button Logic: If text is present, show Send. Else Mic. */}
          <TouchableOpacity
            style={styles.sendButton}
            onPress={messageText.trim().length > 0 ? handleSendText : undefined}
            disabled={messageText.trim().length === 0}
            activeOpacity={0.7}
          >
            <Icon
              name={messageText.trim().length > 0 ? "send" : "mic-outline"}
              size={22}
              color={messageText.trim().length > 0 ? Colors.brand.primary : Colors.black.qua}
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
    backgroundColor: '#F5F5F7', // Explicit light gray background for contrast
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
    backgroundColor: '#FFFFFF', // Explicit white input background
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000', // Explicit black text
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5', // Light gray input field
    borderRadius: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

