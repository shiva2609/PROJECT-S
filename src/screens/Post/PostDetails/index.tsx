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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../theme/colors';
import { Fonts } from '../../../theme/fonts';
import { useAuth } from '../../../providers/AuthProvider';
import CommentCard from '../../../components/post/CommentCard';
import * as PostInteractions from '../../../global/services/posts/post.interactions.service';
import { getUserPublicInfo } from '../../../global/services/user/user.service';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp } from '../../../utils/postHelpers';

/**
 * Comments/Post Details Screen
 * 
 * Displays comments for a post using global hooks.
 * Zero Firestore code - all logic handled by useCommentsManager.
 */
interface Comment {
  id: string;
  userId: string;
  username: string;
  photoURL: string | null;
  text: string;
  createdAt: Timestamp | null;
}

export default function CommentsScreen({ navigation, route }: any) {
  const { postId } = route.params || {};
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Listen to comments using global service
  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    const unsubscribe = PostInteractions.listenToPostComments(postId, (commentsData) => {
      setComments(commentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      return;
    }

    const text = commentText.trim();
    if (!text || !postId) {
      return;
    }

    setSubmitting(true);
    try {
      // Fetch current user profile to get accurate username
      const userProfile = await getUserPublicInfo(user.uid);
      const username = userProfile?.username || user.displayName || user.email?.split('@')[0] || 'User';
      const photoURL = userProfile?.photoURL || user.photoURL || null;
      await PostInteractions.addComment(postId, user.uid, username, photoURL, text);
      setCommentText('');
      // Scroll to bottom after adding comment
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  }, [user, commentText, postId]);

  const renderComment = useCallback(({ item }: { item: Comment }) => {
    const timestampValue = item.createdAt 
      ? (item.createdAt.toMillis?.() || (item.createdAt as any).seconds * 1000 || Date.now())
      : Date.now();
    
    return (
      <CommentCard
        username={item.username || 'Unknown'}
        avatarUri={item.photoURL || undefined}
        text={item.text}
        timestamp={timestampValue}
        onPressUser={() => {
          navigation?.push('ProfileScreen', { userId: item.userId });
        }}
        onLike={() => {
          // Like comment functionality can be added later
        }}
        isLiked={false}
      />
    );
  }, [navigation]);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          windowSize={10}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          contentContainerStyle={styles.commentsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chatbubbles-outline" size={64} color={Colors.black.qua} />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySub}>Be the first to comment!</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.black.qua}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
            onPress={handleSubmit}
            disabled={!commentText.trim() || submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.white.primary} />
            ) : (
              <Icon name="send" size={20} color={Colors.white.primary} />
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
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
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.white.tertiary,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.white.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.white.tertiary,
    opacity: 0.5,
  },
});

