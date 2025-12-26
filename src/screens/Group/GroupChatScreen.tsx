import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import { useUserContext } from '../../providers';
import {
  listenToGroupMessages,
  sendGroupMessage,
  GroupMessage,
  getGroup,
  markGroupAsRead,
} from '../../services/groups/groupService';
import { SmartImage } from '../../components/common/SmartImage';
import GroupMessageBubble from '../../components/group/GroupMessageBubble';

interface GroupChatScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
      groupName: string;
      groupPhotoUrl?: string;
      memberCount: number;
    };
  };
}

export default function GroupChatScreen({ navigation, route }: GroupChatScreenProps) {
  const { user } = useAuth();
  const { currentUser } = useUserContext(); // Full profile access
  const { groupId, groupName: initialGroupName, groupPhotoUrl: initialGroupPhoto, memberCount: initialMemberCount } = route.params;

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState(initialGroupName || 'Group Chat');
  const [groupPhotoUrl, setGroupPhotoUrl] = useState(initialGroupPhoto);
  const [memberCount, setMemberCount] = useState(initialMemberCount || 0);
  const flatListRef = useRef<FlatList>(null);

  const insets = useSafeAreaInsets();
  const BlurComponent = Platform.OS === 'ios' ? BlurView : View;

  // Validate groupId
  useEffect(() => {
    if (!groupId) {
      if (__DEV__) console.error('[GroupChatScreen] Invalid groupId');
      navigation.goBack();
    } else {
      if (__DEV__) console.log('[GroupChatScreen] Loaded with groupId:', groupId);
    }
  }, [groupId, navigation]);

  // Listen to group messages
  useEffect(() => {
    if (!groupId) return;

    if (__DEV__) console.log('[GroupChatScreen] Setting up message listener for group:', groupId);

    // 3️⃣ REAL-TIME MESSAGE LISTENER (Frontend attachment)
    const unsubscribe = listenToGroupMessages(groupId, (newMessages) => {
      // Log as per requirement is inside the service, but we can verify here
      if (__DEV__) console.log('[GroupChatScreen] Received messages update:', newMessages.length);
      // Reverse messages for Inverted FlatList (Newest -> Oldest)
      // Service returns Oldest -> Newest (ASC)
      setMessages([...newMessages].reverse());
      setLoading(false);
    });

    return () => {
      if (__DEV__) console.log('[GroupChatScreen] Cleaning up message listener');
      unsubscribe();
    };
  }, [groupId]);

  // Fetch group details
  useEffect(() => {
    const fetchGroupDetails = async () => {
      const group = await getGroup(groupId);
      if (group) {
        setGroupName(group.name);
        setGroupPhotoUrl(group.image || undefined);
        setMemberCount(group.members.length);
      }
    };

    fetchGroupDetails();
  }, [groupId]);

  // Mark as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.uid && groupId) {
        markGroupAsRead(groupId, user.uid);
        console.log('[GROUP SEEN]', groupId, user.uid);
      }
    }, [groupId, user?.uid])
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !messageText.trim()) return;

    const textToSend = messageText.trim();
    setMessageText('');

    try {
      // Use currentUser name (Source of Truth) -> fallback to displayName -> 'Unknown'
      const senderName = currentUser?.username || currentUser?.name || user.displayName || 'Unknown';

      await sendGroupMessage(
        groupId,
        user.uid,
        senderName,
        textToSend
      );
    } catch (error) {
      if (__DEV__) console.error('Error sending message:', error);
      // Restore message text on error
      setMessageText(textToSend);
    }
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return '';
    // Handle Firestore Timestamp or Date or number
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    if (isNaN(date.getTime())) return '';

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const renderMessage = ({ item, index }: { item: GroupMessage; index: number }) => {
    if (!user) return null;

    const isUserMessage = item.senderId === user.uid;

    // Calculate sequence flags for INVERTED list (Index 0 = Newest)
    // Next item (index + 1) is OLDER (Visually Above)
    // Prev item (index - 1) is NEWER (Visually Below)

    const newerMessage = index > 0 ? messages[index - 1] : null;
    const olderMessage = index < messages.length - 1 ? messages[index + 1] : null;

    // Calculate time gap (10 minutes)
    const getMillis = (msg: GroupMessage | null) => {
      if (!msg?.createdAt) return 0;
      return msg.createdAt.toMillis ? msg.createdAt.toMillis() : new Date(msg.createdAt).getTime();
    };

    const timeGap = olderMessage ? Math.abs(getMillis(item) - getMillis(olderMessage)) : 0;
    const hasTimeGap = timeGap > 10 * 60 * 1000; // 10 minutes

    // First in sequence (Top of block) -> If Older message is diff sender OR significant time gap
    const isFirstInSequence = !olderMessage || olderMessage.senderId !== item.senderId || hasTimeGap;

    // Last in sequence (Bottom of block) -> If Newer message is diff sender
    const isLastInSequence = !newerMessage || newerMessage.senderId !== item.senderId;

    return (
      <GroupMessageBubble
        messageId={item.id}
        text={item.text}
        isOwnMessage={isUserMessage}
        senderId={item.senderId}
        senderName={item.senderName}
        senderPhotoUrl={undefined}
        timestamp={formatTime(item.createdAt)}
        onSenderPress={() => {
          if (!isUserMessage) {
            navigation.navigate('UserProfileDetail', {
              userId: item.senderId,
            });
          }
        }}
        isFirstInSequence={isFirstInSequence} // Visual Top (New Grouping Logic)
        showName={isFirstInSequence && !isUserMessage}   // Name at top
        showAvatar={isFirstInSequence && !isUserMessage} // Avatar at top (Start of block)
      />
    );
  };

  // Header height logic
  // headerHeight = safeArea + 56
  // Standard list (Top-to-Bottom): paddingTop should cover the header.

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
            blurAmount={8}
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
              onPress={() => navigation.navigate('GroupInfo', { groupId })}
              style={styles.headerCenter}
              activeOpacity={0.7}
            >
              {groupPhotoUrl ? (
                <SmartImage
                  uri={groupPhotoUrl}
                  style={styles.headerAvatar}
                  resizeMode="cover"
                  borderRadius={18}
                  showPlaceholder={true}
                />
              ) : (
                <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                  <Text style={styles.headerAvatarText}>
                    {groupName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
                <Text style={styles.headerStatus} numberOfLines={1}>{memberCount} members</Text>
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
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={[
                styles.messagesList,
                {
                  paddingTop: 20,
                  paddingBottom: insets.top + 60 + 8,
                }
              ]}
              showsVerticalScrollIndicator={false}
              inverted={true}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
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
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />

            {messageText.trim().length > 0 ? (
              <TouchableOpacity
                style={[styles.sendButton, styles.sendButtonActive]}
                onPress={handleSend}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
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
    color: '#666666',
    marginTop: 0,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
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
  messagesList: {
    paddingHorizontal: 12,
  },
  inputContainer: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 10 : 12,
    marginTop: 8,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    minHeight: 36,
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
