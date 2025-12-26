/**
 * GroupChatScreen - Main group chat screen
 * Reuses chat UI components with group-specific features
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../providers/AuthProvider';
import {
  listenToGroupMessages,
  sendGroupMessage,
  GroupMessage,
  getGroup,
} from '../../services/groups/groupService';
import GroupChatHeader from '../../components/group/GroupChatHeader';
import GlassInputBar from '../../components/chat/GlassInputBar';
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
  const { groupId, groupName: initialGroupName, groupPhotoUrl: initialGroupPhoto, memberCount: initialMemberCount } = route.params;

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState(initialGroupName || 'Group Chat');
  const [groupPhotoUrl, setGroupPhotoUrl] = useState(initialGroupPhoto);
  const [memberCount, setMemberCount] = useState(initialMemberCount || 0);
  const flatListRef = useRef<FlatList>(null);

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
    
    const unsubscribe = listenToGroupMessages(groupId, (newMessages) => {
      if (__DEV__) console.log('[GroupChatScreen] Received messages:', newMessages.length);
      setMessages(newMessages);
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
        setGroupPhotoUrl(group.photoUrl);
        setMemberCount(group.memberCount);
      }
    };

    fetchGroupDetails();
  }, [groupId]);

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
      await sendGroupMessage(
        groupId,
        user.uid,
        user.displayName || 'Unknown',
        user.photoURL || '',
        textToSend
      );
    } catch (error) {
      if (__DEV__) console.error('Error sending message:', error);
      // Restore message text on error
      setMessageText(textToSend);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
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
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !prevMessage || prevMessage.senderId !== item.senderId;

    return (
      <GroupMessageBubble
        messageId={item.id}
        text={item.text}
        isOwnMessage={isUserMessage}
        senderName={item.senderName}
        senderPhotoUrl={item.senderPhotoUrl}
        timestamp={formatTime(item.timestamp)}
        onSenderPress={() => {
          // Navigate to user profile
          if (!isUserMessage) {
            navigation.navigate('UserProfileDetail', {
              userId: item.senderId,
            });
          }
        }}
        showAvatar={showAvatar && !isUserMessage}
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
        <GroupChatHeader
          groupName={groupName}
          groupPhotoUrl={groupPhotoUrl}
          memberCount={memberCount}
          onBackPress={() => navigation.goBack()}
          onInfoPress={() => {
            navigation.navigate('GroupInfo', {
              groupId,
            });
          }}
        />

        <View style={styles.chatArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E87A5D" />
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

        <GlassInputBar
          value={messageText}
          onChangeText={setMessageText}
          onSend={handleSend}
          onPlusPress={() => {
            // Handle attachment
          }}
          placeholder="Type your message here"
        />
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
});
