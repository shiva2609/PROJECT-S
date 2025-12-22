import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Timestamp, doc, collection } from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import UserAvatar from '../../components/user/UserAvatar';
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { checkNetworkStatus } from '../../hooks/useNetworkState';
import { AppError, ErrorType, withTimeout } from '../../utils/AppError';
import CommentItem from '../../components/comments/CommentItem';

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

  // 🔐 IDEMPOTENCY: Store comment ID for retries
  // If a submission fails, we reuse this ID so the retry doesn't create a duplicate
  const commentIdRef = useRef<string | null>(null);

  // 🔐 SINGLE FLIGHT GUARD
  const singleFlight = useSingleFlight();

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

    // 🔐 SINGLE FLIGHT GUARD
    await singleFlight.execute(`comment:${postId}`, async () => {
      setSubmitting(true);
      setError(null);

      // 🔐 PRE-FLIGHT CHECK
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        Alert.alert('No Internet', 'Please check your connection and try again.');
        setSubmitting(false);
        return;
      }

      try {
        // Fetch current user profile to get accurate username
        const userProfile = await getUserPublicInfo(user.uid);
        const username = userProfile?.username || user.displayName || user.email?.split('@')[0] || 'User';
        const photoURL = userProfile?.photoURL || user.photoURL || userProfilePhoto || null;

        // 🔐 IDEMPOTENCY: Generate ID if needed, reuse if retrying
        if (!commentIdRef.current) {
          commentIdRef.current = doc(collection(db, 'posts', postId, 'comments')).id;
        }
        const commentId = commentIdRef.current;

        // 🔐 TIMEOUT: Wrap network call
        await withTimeout(
          PostInteractions.addComment(postId, user.uid, username, photoURL, text, commentId || undefined),
          15000
        );

        // Success: Clear text and ID
        setCommentText('');
        commentIdRef.current = null;

        // Scroll to top to see the new comment
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } catch (error: any) {
        console.error('❌ [CommentsScreen] Error adding comment:', error);

        const appError = AppError.fromError(error);
        if (appError.type === ErrorType.TIMEOUT) {
          setError('Request timed out. Please try again.');
        } else {
          setError(error.message || 'Failed to add comment');
          Alert.alert('Error', error.message || 'Failed to add comment');
        }
        // NOTE: We DO NOT clear commentIdRef here, so next try uses same ID
      } finally {
        setSubmitting(false);
      }
    });

  };

  const keyExtractor = useCallback((item: Comment) => item.id, []);

  const handleReply = useCallback((comment: Comment) => {
    // Reply logic placeholder
    setCommentText(`@${comment.username} `);
  }, []);

  const renderCommentItem = useCallback(({ item }: { item: Comment }) => (
    <CommentItem
      item={item}
      onReply={handleReply}
    />
  ), [handleReply]);

  const EmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Icon name="chatbubbles-outline" size={48} color={Colors.brand.primary} />
      </View>
      <Text style={styles.emptyText}>No comments yet</Text>
      <Text style={styles.emptySub}>Start the conversation.</Text>
    </View>
  ), []);

  const Separator = useCallback(() => <View style={styles.separator} />, []);

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
          renderItem={renderCommentItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.commentsList,
            comments.length === 0 && styles.emptyListContainer
          ]}
          ListEmptyComponent={EmptyComponent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          ItemSeparatorComponent={Separator}
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
