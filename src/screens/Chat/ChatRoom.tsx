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
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import MessageBubble from '../../components/chat/MessageBubble';
import { SmartImage } from '../../components/common/SmartImage';
import { sendMessage, listenToMessages, setReadReceipt, Message } from '../../services/chat/MessagesAPI';
import { markChatAsRead } from '../../services/notifications/notificationService';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';

interface ChatRoomScreenProps {
  navigation: any;
  route: any;
}

// Header height constant for proper message list offset
// Matches GlassHeader minHeight (56px) + safe area top padding
const HEADER_HEIGHT = 56;

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
          <Icon name="alert-circle-outline" size={64} color="#7A7A7A" />
          <Text style={styles.emptyText}>Invalid Chat</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            <Text style={{ color: '#F28C6B' }}>Go Back</Text>
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
  const [otherUserData, setOtherUserData] = useState<any>({
    username: route?.params?.username || 'User',
    photoUrl: route?.params?.profilePhoto
  });
  const flatListRef = useRef<FlatList>(null);

  // Smart caching for profile photo
  const avatarUri = useProfilePhoto(otherUserId);

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
    if (!chatId || !user?.uid) return;

    console.log('[ChatRoom] Setting up listener for chatId:', chatId);

    // Mark chat as read immediately when opening (don't wait for listener)
    markChatAsRead(user.uid, chatId).catch(e => console.error('Failed to mark chat read on open:', e));

    // Set loading false after a short delay to prevent infinite loading
    // The listener will update messages when they arrive
    const loadingTimeout = setTimeout(() => {
      console.log('[ChatRoom] Loading timeout reached, setting loading=false');
      setLoading(false);
    }, 1000);

    // Use V2 listener with metadata changes (pending writes)
    const unsubscribe = listenToMessages(chatId, (newMessages) => {
      console.log('[ChatRoom] Listener callback fired, messages count:', newMessages.length);

      // With includeMetadataChanges: true, this snapshot includes local pending writes.
      // Firestore `orderBy('createdAt', 'desc')` handles pending timestamps by placing them at the top (newest).

      // Inverted FlatList requires [Newest, ..., Oldest]
      // MessagesAPI returns [Oldest, ..., Newest] (due to .reverse())
      // So we reverse it BACK to [Newest, ..., Oldest]
      const reversed = [...newMessages].reverse();

      setMessages(reversed);
      setLoading(false);
      clearTimeout(loadingTimeout);

      // Update read timestamp (in case new messages arrived while viewing)
      markChatAsRead(user.uid, chatId).catch(e => console.error('Failed to mark chat read', e));

      // Mark unseen messages as seen/read
      newMessages.forEach(msg => {
        if (msg.from !== user.uid && !msg.read) {
          setReadReceipt(chatId, msg.id, user.uid)
            .catch(err => console.error('Failed to set read receipt:', err));
        }
      });
    });

    console.log('[ChatRoom] Listener setup complete');

    return () => {
      console.log('[ChatRoom] Cleaning up listener for chatId:', chatId);
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [chatId, user?.uid]);


  // Auto-scroll to latest message when messages change
  // Auto-scroll to latest message when messages change
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout;

    if (messages.length > 0 && flatListRef.current && !loading) {
      console.log('[ChatRoom] Auto-scrolling to latest message, count:', messages.length);

      // For inverted FlatList, index 0 is the latest message
      // Use a small delay to ensure FlatList has rendered
      scrollTimer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: 0,
            animated: false,
            viewPosition: 0,
          });
        } catch (error) {
          console.log('[ChatRoom] scrollToIndex failed, using scrollToOffset');
          // Fallback
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }
      }, 150);
    }

    return () => clearTimeout(scrollTimer);
  }, [messages, loading]);

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

    // Scroll to show the new message immediately
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);

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

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
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

    // Show profile image for incoming messages
    // For inverted FlatList: index 0 is newest, so check next message (index + 1) for grouping
    // Show profile image if:
    // 1. It's an incoming message
    // 2. It's the last message (index 0 in inverted list) OR
    // 3. The next message (older) is from a different sender OR
    // 4. There's a time gap > 5 minutes
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    let showProfileImage = false;
    
    if (!isSent) {
      if (!nextMessage || nextMessage.from !== item.from) {
        // Different sender or last message in list
        showProfileImage = true;
      } else {
        // Same sender - check time gap
        let nextTimestamp = Date.now();
        if (typeof nextMessage.createdAt === 'number') {
          nextTimestamp = nextMessage.createdAt;
        } else if (nextMessage.createdAt?.toMillis) {
          nextTimestamp = nextMessage.createdAt.toMillis();
        }
        const timeDiff = timestamp - nextTimestamp;
        // If time gap > 5 minutes, show profile image
        if (timeDiff > 300000) {
          showProfileImage = true;
        }
      }
    }

    return (
      <MessageBubble
        type={type}
        text={item.text}
        imageUri={item.mediaUrl}
        videoUri={item.type === 'video' ? item.mediaUrl : undefined}
        timestamp={timestamp}
        profileImageUri={!isSent ? avatarUri : undefined}
        showProfileImage={showProfileImage}
        onProfilePress={!isSent ? handleMessageProfilePress : undefined}
      />
    );
  }, [user?.uid, messages, avatarUri, handleMessageProfilePress]);


  const handleProfilePress = useCallback(() => {
    navigation.navigate('ProfileOptions', {
      userId: otherUserId,
      username: displayName,
      profilePhoto: avatarUri,
    });
  }, [navigation, otherUserId, displayName, avatarUri]);

  const handleMessageProfilePress = useCallback(() => {
    navigation.navigate('ProfileScreen', { userId: otherUserId });
  }, [navigation, otherUserId]);

  const displayName = otherUserData?.name || otherUserData?.username || 'User';
  const lastSeen = 'Active 1h ago'; // TODO: Get actual last seen time
  const insets = useSafeAreaInsets();
  const BlurComponent = Platform.OS === 'ios' ? BlurView : View;
  const screenWidth = Dimensions.get('window').width;
  const headerWidth = screenWidth * 0.90; // 90% of screen width
  
  // Calculate header height: safe area + header content (compact ~44px) + margin
  const headerHeight = insets.top + 44 + 8;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Custom Header with Glass Effect - Pill Shaped */}
        <View style={[styles.headerContainer, { width: headerWidth, marginLeft: (screenWidth - headerWidth) / 2 }]}>
          <BlurComponent
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.35)"
          />
          <View style={[styles.header, { paddingTop: insets.top + 4, paddingBottom: 4 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <View style={styles.backButtonCircle}>
              <Icon name="arrow-back" size={20} color="#F28C6B" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleProfilePress}
            style={styles.headerCenter}
            activeOpacity={0.7}
          >
            {avatarUri ? (
              <SmartImage
                uri={avatarUri}
                style={styles.headerAvatar}
                resizeMode="cover"
                borderRadius={20}
                showPlaceholder={true}
              />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                <Text style={styles.headerAvatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{displayName}</Text>
              <Text style={styles.headerStatus}>{lastSeen}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton}>
              <Icon name="call-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}>
              <Icon name="videocam-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          </View>
        </View>

        {/* Chat Area with Gradient Background */}
        <LinearGradient
          colors={['#FBE4D8', '#F6C1A5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.chatGradient}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F28C6B" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="chatbubbles-outline" size={64} color="#7A7A7A" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start your first conversation with {displayName}.
              </Text>
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
              contentContainerStyle={[
                styles.messagesList,
                { paddingTop: headerHeight + 8 }
              ]}
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={(info) => {
                console.log('[ChatRoom] scrollToIndex failed, info:', info);
                setTimeout(() => {
                  flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                }, 100);
              }}
            />
          )}
        </LinearGradient>

        {/* Message Input Bar with Glass Effect */}
        <View style={styles.inputContainer}>
          <BlurComponent
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.35)"
          />
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachButton} onPress={() => { }}>
              <Icon name="add" size={24} color="#F28C6B" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Type your message here"
              placeholderTextColor="#7A7A7A"
              value={messageText}
              onChangeText={(text) => setMessageText(text)}
              multiline
              maxLength={1000}
            />

            {messageText.trim().length > 0 ? (
              <TouchableOpacity
                style={[styles.sendButton, styles.sendButtonActive]}
                onPress={handleSendText}
                activeOpacity={0.7}
              >
                <Icon name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, styles.micButton]}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#2E3A59', '#3F4C6B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.micButtonGradient}
                >
                  <Icon name="mic-outline" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBE4D8',
  },
  keyboardView: {
    flex: 1,
  },
  headerContainer: {
    marginTop: 6,
    borderRadius: 999, // Pill shape
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  backButton: {
    padding: 2,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAD3C5',
  },
  headerAvatarPlaceholder: {
    backgroundColor: '#F28C6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2B2B',
  },
  headerStatus: {
    fontSize: 12,
    color: '#7A7A7A',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F28C6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatGradient: {
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
    color: '#2B2B2B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#7A7A7A',
    marginTop: 8,
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  inputContainer: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 20 : 12,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    minHeight: 40,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#2B2B2B',
    maxHeight: 100,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#F28C6B',
  },
  micButton: {
    overflow: 'hidden',
  },
  micButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

