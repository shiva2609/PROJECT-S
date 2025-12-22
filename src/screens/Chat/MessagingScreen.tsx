import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SmartImage } from '../../components/common/SmartImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import { listenToDirectMessages, sendMessage, ChatMessage } from '../../services/api/firebaseService';
import { getCopilotChatMessages } from '../../services/chat/chatService';
import { collection, query, orderBy, onSnapshot } from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import ItineraryCard from '../../components/itinerary/ItineraryCard';
import { ItineraryResponse } from '../../services/itinerary/generateItinerary';
import { markChatAsRead } from '../../services/notifications/notificationService';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';

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
  itineraryData?: ItineraryResponse;
  timestamp?: number;
  createdAt?: any;
}

export default function MessagingScreen({ navigation, route }: MessagingScreenProps) {
  const { user } = useAuth();
  const { userId, username, isCopilot } = route.params;
  // Use unified profile photo hook
  const profilePhoto = useProfilePhoto(isCopilot ? null : userId);

  const [messages, setMessages] = useState<(ChatMessage | CopilotMessage)[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<string>('Active 1h ago'); // TODO: Get actual last seen time
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user || !userId) return;

    // Mark chat as read when screen opens
    markChatAsRead(user.uid, userId);

    if (isCopilot && userId === 'sanchari-copilot') {
      // Listen to Copilot chat messages
      const messagesRef = collection(db, 'users', user.uid, 'chats', 'sanchari-copilot', 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const copilotMessages: CopilotMessage[] = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        })) as CopilotMessage[];

        setMessages(copilotMessages);
        setLoading(false);

        // Scroll to top (start of conversation) when chat opens
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }, (error: any) => {
        console.error('Error listening to copilot messages:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Listen to messages between current user and selected user
      const unsubscribe = listenToDirectMessages(user.uid, userId, (msgs) => {
        setMessages(msgs);
        setLoading(false);

        // Scroll to top (start of conversation) when chat opens
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      });

      return () => unsubscribe();
    }
  }, [user, userId, isCopilot]);

  const handleSend = async () => {
    if (!messageText.trim() || !user) return;

    // Don't allow sending messages to Copilot (it's a one-way system chat)
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

      // Auto-scroll after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp: number | any) => {
    let date: Date;

    // Handle Firestore Timestamp
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
    const isCopilotMessage = (item as CopilotMessage).messageType === 'itinerary';
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;

    // Get timestamp properly
    let itemTimestamp: number | any = (item as ChatMessage).createdAt || (item as CopilotMessage).timestamp || Date.now();
    let nextTimestamp: number | any = nextMessage ? ((nextMessage as ChatMessage).createdAt || (nextMessage as CopilotMessage).timestamp || Date.now()) : Date.now();

    // Convert Firestore Timestamps to numbers for comparison
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
      (Math.abs(nextTimestamp - itemTimestamp) > 300000); // 5 minutes

    // Render itinerary message
    if (isCopilotMessage && (item as CopilotMessage).itineraryData) {
      const copilotItem = item as CopilotMessage;
      return (
        <View key={item.id}>
          <View style={[styles.messageContainer, styles.otherMessageContainer]}>
            <View style={[styles.messageAvatar, { backgroundColor: '#FF5C02' }]}>
              <Icon name="compass-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={[styles.messageBubble, styles.otherBubble, { maxWidth: '85%' }]}>
              <ItineraryCard
                itinerary={copilotItem.itineraryData!}
                onSave={undefined} // Already saved
              />
            </View>
          </View>
          {showTimestamp && (
            <Text style={[styles.timestamp, styles.timestampLeft]}>
              {formatTime(itemTimestamp)}
            </Text>
          )}
        </View>
      );
    }

    // Render regular message
    return (
      <View key={item.id}>
        <View
          style={[
            styles.messageContainer,
            isUserMessage ? styles.userMessageContainer : styles.otherMessageContainer,
          ]}
        >
          {/* Profile picture for receiver's messages only */}
          {!isUserMessage && (
            isCopilot ? (
              <View style={[styles.messageAvatar, { backgroundColor: '#FF5C02' }]}>
                <Icon name="compass-outline" size={20} color="#FFFFFF" />
              </View>
            ) : isDefaultProfilePhoto(profilePhoto) ? (
              <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                <Text style={styles.messageAvatarText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <SmartImage
                uri={profilePhoto}
                style={styles.messageAvatar as any}
                borderRadius={18}
              />
            )
          )}

          <View
            style={[
              styles.messageBubble,
              isUserMessage ? styles.userBubble : styles.otherBubble,
            ]}
          >
            <Text style={[styles.messageText, isUserMessage && styles.userMessageText]}>
              {(item as ChatMessage).text || (item as CopilotMessage).text || ''}
            </Text>
          </View>
        </View>

        {showTimestamp && (
          <Text style={[
            styles.timestamp,
            isUserMessage ? styles.timestampRight : styles.timestampLeft
          ]}>
            {formatTime(itemTimestamp)}
          </Text>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Icon name="chatbubbles-outline" size={64} color="#E87A5D" />
      </View>
      <Text style={styles.emptyTitle}>
        {isCopilot ? 'No saved itineraries yet' : `No messages yet with ${username}`}
      </Text>
      <Text style={styles.emptySubtext}>
        {isCopilot
          ? 'Save an itinerary from the Itinerary Builder to see it here.'
          : 'Start your first conversation with this traveler.'}
      </Text>
      {!isCopilot && (
        <TouchableOpacity
          style={styles.sendMessageButton}
          onPress={() => {
            // Focus on input when button is pressed
            setMessageText('');
          }}
        >
          <Text style={styles.sendMessageButtonText}>Send Message</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Top App Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <View style={styles.backButtonCircle}>
              <Icon name="arrow-back" size={20} color="#E87A5D" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerCenterBar}>
            {isCopilot ? (
              <View style={[styles.headerAvatar, { backgroundColor: '#FF5C02', justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="compass-outline" size={24} color="#FFFFFF" />
              </View>
            ) : profilePhoto ? (
              <SmartImage
                uri={profilePhoto}
                style={styles.headerAvatar as any}
                borderRadius={20}
              />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                <Text style={styles.headerAvatarText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{username}</Text>
              <Text style={styles.headerStatus}>{lastSeen}</Text>
            </View>
          </View>

          {!isCopilot && (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionButton}>
                <Icon name="call-outline" size={22} color="#E87A5D" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton}>
                <Icon name="videocam-outline" size={22} color="#E87A5D" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Chat Area with Gradient Background */}
        <LinearGradient
          colors={['#FFF5F0', '#FFE8E0', '#FFDDD0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.chatGradient}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E87A5D" />
            </View>
          ) : messages.length === 0 ? (
            renderEmptyState()
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
        </LinearGradient>

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotDelay1]} />
              <View style={[styles.typingDot, styles.typingDotDelay2]} />
            </View>
          </View>
        )}

        {/* Bottom Input Bar - Hidden for Copilot chat */}
        {!isCopilot && (
          <View style={styles.inputContainer}>
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.attachButton}>
                <Icon name="add" size={24} color="#3C3C3B" />
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                placeholder="Type your message here"
                placeholderTextColor="#757574"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
              />

              <TouchableOpacity
                style={styles.micButton}
                onPress={messageText.trim() ? handleSend : () => {
                  // TODO: Handle voice input
                  console.log('Voice input not implemented yet');
                }}
              >
                <Icon
                  name={messageText.trim() ? "send" : "mic-outline"}
                  size={22}
                  color="#3C3C3B"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F0', // Light peach background
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255, 237, 230, 0.8)', // Light peach, slightly transparent
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarPlaceholder: {
    backgroundColor: '#E87A5D',
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
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'System',
  },
  headerStatus: {
    fontSize: 12,
    color: '#757574',
    marginTop: 2,
    fontFamily: 'System',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    maxWidth: '85%',
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    marginLeft: 0,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  } as any,
  messageAvatarPlaceholder: {
    backgroundColor: '#E87A5D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#FFF5F0', // Light peach/cream gradient background
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginLeft: 8,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    marginRight: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#3C3C3B',
    fontFamily: 'System',
    textAlign: 'left',
  },
  userMessageText: {
    color: '#3C3C3B', // Dark text on light peach background
  },
  timestamp: {
    fontSize: 11,
    color: '#A0A0A0',
    marginTop: 4,
    marginBottom: 8,
    fontFamily: 'System',
  },
  timestampLeft: {
    textAlign: 'left',
    marginLeft: 44, // Align with message bubble (avatar 36px + margin 8px)
  },
  timestampRight: {
    textAlign: 'right',
    marginRight: 8,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#757574',
  },
  typingDotDelay1: {
    // Animation delay handled by animation library if needed
  },
  typingDotDelay2: {
    // Animation delay handled by animation library if needed
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    paddingHorizontal: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 237, 230, 0.8)', // Light peach input bar
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    minHeight: 48,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#3C3C3B',
    maxHeight: 100,
    fontFamily: 'System',
    paddingVertical: 4,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#F8F5F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C3C3B',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#757574',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    fontFamily: 'System',
  },
  sendMessageButton: {
    backgroundColor: '#E87A5D', // Brand Coral
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#E87A5D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendMessageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
});

