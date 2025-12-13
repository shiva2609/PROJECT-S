import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';
import { formatTimestamp } from '../../utils/postHelpers';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';
import * as PostInteractions from '../../global/services/posts/post.interactions.service';
import { getUserPublicInfo } from '../../global/services/user/user.service';
import { Timestamp } from 'firebase/firestore';
import UserAvatar from '../../components/user/UserAvatar';

interface Comment {
  id: string;
  userId: string;
  username: string;
  photoURL: string | null;
  text: string;
  createdAt: Timestamp | null;
}

export default function CommentsScreen({ navigation, route }: any) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const userProfilePhoto = useProfilePhoto(user?.uid || '');

  // Animation for send button
  const sendScale = useRef(new Animated.Value(1)).current;

  // Listen to comments in real-time
  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    setError(null);
    const unsubscribe = PostInteractions.listenToPostComments(postId, (commentsData) => {
      setComments(commentsData);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }

    const text = commentText.trim();
    if (!text) {
      return;
    }

    // Animate button
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setSubmitting(true);
    try {
      // Fetch current user profile to get accurate username
      const userProfile = await getUserPublicInfo(user.uid);
      const username = userProfile?.username || user.displayName || user.email?.split('@')[0] || 'User';
      const photoURL = userProfile?.photoURL || user.photoURL || userProfilePhoto || null;

      await PostInteractions.addComment(postId, user.uid, username, photoURL, text);
      setCommentText('');

      // Scroll to top to see the new comment
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error: any) {
      setError(error.message || 'Failed to add comment');
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = useCallback(({ item }: { item: Comment }) => {
    const timestampValue = item.createdAt
      ? (item.createdAt.toMillis?.() || (item.createdAt as any).seconds * 1000 || Date.now())
      : Date.now();
    const timestamp = formatTimestamp(timestampValue);

    return (
      <View style={styles.commentItem}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <UserAvatar
            uri={item.photoURL || undefined}
            size="sm"
          />
        </View>

        {/* Content Stack */}
        <View style={styles.commentContent}>
          {/* Username */}
          <Text style={styles.commentUsername} numberOfLines={1}>
            {item.username}
          </Text>

          {/* Comment Text */}
          <Text style={styles.commentText}>
            {item.text}
          </Text>

          {/* Footer Row: Time + Reply + Like */}
          <View style={styles.commentFooter}>
            <Text style={styles.commentTimestamp}>{timestamp}</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.footerAction}>
              <Text style={styles.replyText}>Reply</Text>
            </TouchableOpacity>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Like Icon */}
            <TouchableOpacity
              style={styles.likeButton}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="heart-outline" size={16} color={Colors.black.qua} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.commentsList,
            comments.length === 0 && styles.emptyListContainer
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="chatbubbles-outline" size={48} color={Colors.brand.primary} />
              </View>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySub}>Start the conversation.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          {/* User Avatar */}
          <UserAvatar
            uri={userProfilePhoto || undefined}
            size="sm"
          />

          {/* Input Field */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.black.qua}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              editable={!submitting}
            />
          </View>

          {/* Send Button */}
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || submitting) && styles.sendButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!commentText.trim() || submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white.primary} />
              ) : (
                <Icon
                  name="arrow-up"
                  size={20}
                  color={Colors.white.primary}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.secondary,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  commentsList: {
    paddingVertical: 8,
    paddingBottom: 40, // Extra padding for last item
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 16, // Vertical spacing between comments
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  avatarContainer: {
    marginRight: 12,
    paddingTop: 4,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  commentTimestamp: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginRight: 16,
  },
  footerAction: {
    paddingVertical: 2,
    marginRight: 12,
  },
  replyText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.black.qua,
  },
  likeButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.white.tertiary,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
  },
  input: {
    padding: 0, // Remove default padding
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // shadow
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.white.qua,
    shadowOpacity: 0,
    elevation: 0,
  },
});
