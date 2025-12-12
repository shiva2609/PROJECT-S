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
import { useMessageManager } from '../../hooks/useMessageManager';
import MessageBubble from '../../components/chat/MessageBubble';
import MediaPicker from '../../components/create/MediaPicker';
import GlassHeader from '../../components/layout/GlassHeader';
import UserAvatar from '../../components/user/UserAvatar';
import { Colors } from '../../theme/colors';
import * as MessagesAPI from '../../services/chat/MessagesAPI';

interface ChatRoomScreenProps {
  navigation: any;
  route: {
    params: {
      conversationId: string;
      otherUserId: string;
      username: string;
      avatarUri?: string;
    };
  };
}

/**
 * Chat Room Screen
 * 
 * Displays messages in a conversation using useMessageManager.
 * Zero Firestore code - uses global hooks.
 */
export default function ChatRoomScreen({ navigation, route }: ChatRoomScreenProps) {
  const { user } = useAuth();
  const { conversationId, otherUserId, username, avatarUri } = route.params;
  const { messages, sendTextMessage, sendImageMessage, sendVideoMessage, fetchMessages, typingState } = useMessageManager();
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const conversationMessages = messages[conversationId] || [];
  const isTyping = typingState[conversationId] || false;

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId).then(() => {
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }).catch((error) => {
        console.error('Error fetching messages:', error);
        setLoading(false);
      });
    }
  }, [conversationId, fetchMessages]);

  const handleSendText = useCallback(async () => {
    if (!messageText.trim() || !user?.uid) return;

    const text = messageText.trim();
    setMessageText('');

    try {
      await sendTextMessage(conversationId, text);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
      setMessageText(text); // Restore text on error
    }
  }, [messageText, conversationId, user?.uid, sendTextMessage]);

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

    return (
      <MessageBubble
        type={type}
        text={item.text}
        imageUri={item.imageUri}
        videoUri={item.videoUri}
        timestamp={item.timestamp}
      />
    );
  }, [user?.uid]);

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
          </View>
        ) : conversationMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="chatbubbles-outline" size={64} color={Colors.black.qua} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start your first conversation with {username}.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={conversationMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            windowSize={10}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            removeClippedSubviews
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {isTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotDelay1]} />
              <View style={[styles.typingDot, styles.typingDotDelay2]} />
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={() => {}}>
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

