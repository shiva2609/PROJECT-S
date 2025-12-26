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

  const handleMessageProfilePress = useCallback(() => {
    navigation.navigate('ProfileScreen', { userId: otherUserId });
  }, [navigation, otherUserId]);

  // Display Name logic (moved up)
  const displayName = otherUserData?.name || otherUserData?.username || 'User';

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

    // LIST IS INVERTED [Newest, ..., Oldest]
    // index is current message.
    // index + 1 is OLDER message.
    // index - 1 is NEWER message.

    // Grouping Logic:
    // A "Block" is a sequence of messages from same sender.
    // "First" in sequence = Chronologically Top = Visually Top = Oldest in block.
    // In Inverted List, Oldest in block is the one where (index + 1) is Different Sender.

    // "Last" in sequence = Chronologically Bottom = Visually Bottom = Newest in block.
    // In Inverted List, Newest in block is the one where (index - 1) is Different Sender.

    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null; // Older
    const prevMessage = index > 0 ? messages[index - 1] : null; // Newer

    // Check if First In Sequence (Visual Top of block)
    // If nextMessage (older) does NOT exist, we are the very first message -> we are First.
    // If nextMessage exists but different sender -> we start a new block -> we are First.
    // If nextMessage exists, same sender, but Time Gap > 5 min -> we start a new block -> we are First.

    let isFirstInSequence = false;
    if (!nextMessage || nextMessage.from !== item.from) {
      isFirstInSequence = true;
    } else {
      // Check time gap
      let nextTimestamp = Date.now();
      if (typeof nextMessage.createdAt === 'number') {
        nextTimestamp = nextMessage.createdAt;
      } else if (nextMessage.createdAt?.toMillis) {
        nextTimestamp = nextMessage.createdAt.toMillis();
      }
      const timeDiff = timestamp - nextTimestamp;
      if (timeDiff > 300000) { // 5 min
        isFirstInSequence = true;
      }
    }

    // Check if Last In Sequence (Visual Bottom of block)
    // If prevMessage (newer) does NOT exist, we are latest -> we are Last.
    // If prevMessage exists but different sender -> we end the block -> we are Last.

    let isLastInSequence = false;
    if (!prevMessage || prevMessage.from !== item.from) {
      isLastInSequence = true;
    } else {
      // Check time gap from Prev to Us?
      // Usually time gap breaks the sequence at the Top.
      // So if Prev (Newer) is > 5 min newer than Us, then Prev is First of HIS block.
      // Which means WE are Last of OUR block.

      let prevTimestamp = Date.now();
      if (typeof prevMessage.createdAt === 'number') {
        prevTimestamp = prevMessage.createdAt;
      } else if (prevMessage.createdAt?.toMillis) {
        prevTimestamp = prevMessage.createdAt.toMillis();
      }
      const timeDiff = prevTimestamp - timestamp;
      if (timeDiff > 300000) {
        isLastInSequence = true;
      }
    }

    // Show Avatar: Only for First message in sequence
    // User Requirement: "remove the profile photo for every message bubble in chat screen from incoming messages. no need of that"
    // So we force showProfileImage to false ALWAYS.
    const showProfileImage = false;

    const formattedTimestamp = timestamp; // Pass number to component

    return (
      <MessageBubble
        type={type}
        text={item.text}
        imageUri={item.mediaUrl}
        videoUri={item.type === 'video' ? item.mediaUrl : undefined}
        timestamp={formattedTimestamp}
        profileImageUri={!isSent ? avatarUri : undefined}
        showProfileImage={showProfileImage}
        onProfilePress={!isSent ? handleMessageProfilePress : undefined}
        isFirstInSequence={isFirstInSequence}
        isLastInSequence={isLastInSequence}
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

  // handleMessageProfilePress and displayName moved up

  const lastSeen = 'Active 1h ago'; // TODO: Get actual last seen time
  const insets = useSafeAreaInsets();
  const BlurComponent = Platform.OS === 'ios' ? BlurView : View;
  const screenWidth = Dimensions.get('window').width;
  const headerWidth = screenWidth * 0.90; // 90% of screen width


  const headerHeight = insets.top + 56; // Fixed height header

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Custom Header with Glass Effect - Rounded Bottom Only */}
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          <BlurComponent
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={8} // Reduced blur
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.85)"
          />
          <View style={[styles.header, { height: 60 }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-back" size={24} color="#F28C6B" />
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
                  borderRadius={18}
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
                <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
                <Text style={styles.headerStatus} numberOfLines={1}>{lastSeen}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionButton}>
                <Icon name="call" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton}>
                <Icon name="videocam" size={20} color="#FFFFFF" />
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
                // Inverted List: 
                // paddingTop = Visual Bottom (Space above Input Bar)
                // paddingBottom = Visual Top (Space under Header)
                {
                  paddingTop: 4,
                  paddingBottom: headerHeight + 16
                }
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
    </View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // Slightly more opaque
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 0, // Removed border
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // Consistent padding (16-20dp)
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  backButtonCircle: {
    // unused now
    width: 0,
    height: 0,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  headerAvatarPlaceholder: {
    backgroundColor: '#F28C6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    fontFamily: 'System',
  },
  headerStatus: {
    fontSize: 12,
    color: '#666666', // Lighter secondary
    marginTop: 0,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12, // Increased gap
    paddingRight: 4,
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
    paddingHorizontal: 12, // Reduced from 16
    paddingBottom: 4,      // Reduced from 12 for minimal gap
  },
  inputContainer: {
    marginHorizontal: 16, // Premium width
    marginBottom: Platform.OS === 'ios' ? 10 : 12, // Reduced bottom margin
    marginTop: 8, // Little padding above input as requested
    borderRadius: 28, // More rounded
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)', // More opaque/premium
    paddingHorizontal: 14,
    paddingVertical: 12, // "Increase the bottom container" -> taller padding
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    minHeight: 36, // Taller touch target
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

