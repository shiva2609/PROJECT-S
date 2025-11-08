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
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { listenToDirectMessages, sendMessage, ChatMessage } from '../api/firebaseService';

interface MessagingScreenProps {
  navigation: any;
  route: {
    params: {
      userId: string;
      username: string;
      profilePhoto?: string;
    };
  };
}

export default function MessagingScreen({ navigation, route }: MessagingScreenProps) {
  const { user } = useAuth();
  const { userId, username, profilePhoto } = route.params;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<string>('Active 1h ago'); // TODO: Get actual last seen time
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user || !userId) return;

    // Listen to messages between current user and selected user
    const unsubscribe = listenToDirectMessages(user.uid, userId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [user, userId]);

  const handleSend = async () => {
    if (!messageText.trim() || !user) return;

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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUserMessage = item.senderId === user?.uid;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
    const showTimestamp = index === messages.length - 1 || 
      (nextMessage && nextMessage.createdAt - item.createdAt > 300000); // 5 minutes

    return (
      <View key={item.id}>
        <View
          style={[
            styles.messageContainer,
            isUserMessage ? styles.userMessageContainer : styles.otherMessageContainer,
          ]}
        >
          {/* Profile picture for receiver's messages */}
          {!isUserMessage && (
            profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.messageAvatar}
              />
            ) : (
              <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                <Text style={styles.messageAvatarText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )
          )}
          
          <View
            style={[
              styles.messageBubble,
              isUserMessage ? styles.userBubble : styles.otherBubble,
            ]}
          >
            <Text style={[styles.messageText, isUserMessage && styles.userMessageText]}>
              {item.text}
            </Text>
          </View>
        </View>
        
        {showTimestamp && (
          <Text style={[
            styles.timestamp,
            isUserMessage ? styles.timestampRight : styles.timestampLeft
          ]}>
            {formatTime(item.createdAt)}
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
      <Text style={styles.emptyTitle}>No messages yet with {username}</Text>
      <Text style={styles.emptySubtext}>Start your first conversation with this traveler.</Text>
      <TouchableOpacity
        style={styles.sendMessageButton}
        onPress={() => {
          // Focus on input when button is pressed
          setMessageText('');
        }}
      >
        <Text style={styles.sendMessageButtonText}>Send Message</Text>
      </TouchableOpacity>
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
            {profilePhoto ? (
              <Image 
                source={{ uri: profilePhoto }} 
                style={styles.headerAvatar as any}
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

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton}>
              <Icon name="call-outline" size={22} color="#E87A5D" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}>
              <Icon name="videocam-outline" size={22} color="#E87A5D" />
            </TouchableOpacity>
          </View>
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
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              showsVerticalScrollIndicator={false}
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

        {/* Bottom Input Bar */}
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
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
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
    marginVertical: 6,
    maxWidth: '75%',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: 'rgba(255, 237, 230, 0.9)', // Light peach, slightly opaque
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#3C3C3B',
    fontFamily: 'System',
  },
  userMessageText: {
    color: '#3C3C3B', // Dark text on light peach background
  },
  timestamp: {
    fontSize: 11,
    color: '#757574',
    marginTop: 4,
    marginBottom: 8,
    fontFamily: 'System',
  },
  timestampLeft: {
    textAlign: 'left',
    marginLeft: 36, // Align with message bubble (avatar + margin)
  },
  timestampRight: {
    textAlign: 'right',
    marginRight: 0,
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

