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
  Image,
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
      
      // Auto-scroll to bottom when new comments arrive
      if (commentsData.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
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

    setSubmitting(true);
    try {
      // Fetch current user profile to get accurate username
      const userProfile = await getUserPublicInfo(user.uid);
      const username = userProfile?.username || user.displayName || user.email?.split('@')[0] || 'User';
      const photoURL = userProfile?.photoURL || user.photoURL || userProfilePhoto || null;
      
      await PostInteractions.addComment(postId, user.uid, username, photoURL, text);
      setCommentText('');
      
      // Scroll to bottom after adding comment
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error: any) {
      setError(error.message || 'Failed to add comment');
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // The useEffect will re-run and re-subscribe
  };

  const renderComment = useCallback(({ item }: { item: Comment }) => {
    // Use photoURL from comment data (stored when comment was created)
    const avatarUri = item.photoURL;
    const timestampValue = item.createdAt 
      ? (item.createdAt.toMillis?.() || (item.createdAt as any).seconds * 1000 || Date.now())
      : Date.now();
    const timestamp = formatTimestamp(timestampValue);
    
    return (
      <View style={styles.commentItem}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {!avatarUri || isDefaultProfilePhoto(avatarUri) ? (
            <View style={styles.commentAvatar}>
              <Icon name="person" size={20} color={Colors.black.qua} />
            </View>
          ) : (
            <Image 
              source={{ uri: avatarUri }} 
              defaultSource={{ uri: getDefaultProfilePhoto() }}
              style={styles.commentAvatar} 
              resizeMode="cover"
            />
          )}
        </View>

        {/* Content */}
        <View style={styles.commentContent}>
          <View style={styles.commentTextContainer}>
            <Text style={styles.commentUsername}>{item.username || 'Unknown'}</Text>
            <Text style={styles.commentText}> {item.text}</Text>
          </View>
          {timestamp ? (
            <Text style={styles.commentTimestamp}>{timestamp}</Text>
          ) : null}
        </View>

        {/* Like Icon (outline only) */}
        <TouchableOpacity 
          style={styles.likeButton}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="heart-outline" size={14} color={Colors.black.qua} />
        </TouchableOpacity>
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

  if (error && comments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={Colors.black.qua} />
          <Text style={styles.errorText}>Failed to load comments</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
          contentContainerStyle={[
            styles.commentsList,
            comments.length === 0 && styles.emptyListContainer
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chatbubbles-outline" size={64} color={Colors.black.qua} />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySub}>Be the first to comment</Text>
            </View>
          }
          onContentSizeChange={() => {
            if (comments.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          {/* User Avatar */}
          <View style={styles.inputAvatarContainer}>
            {isDefaultProfilePhoto(userProfilePhoto) ? (
              <View style={styles.inputAvatar}>
                <Icon name="person" size={16} color={Colors.black.qua} />
              </View>
            ) : (
              <Image 
                source={{ uri: userProfilePhoto }} 
                defaultSource={{ uri: getDefaultProfilePhoto() }}
                style={styles.inputAvatar} 
                resizeMode="cover"
              />
            )}
          </View>

          {/* Text Input */}
          <TextInput
            style={styles.input}
            placeholder="Add a comment…"
            placeholderTextColor={Colors.black.qua}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            editable={!submitting}
          />

          {/* Send Button */}
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
                name="send" 
                size={18} 
                color={Colors.white.primary} 
              />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.brand.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
  content: {
    flex: 1,
  },
  commentsList: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  commentContent: {
    flex: 1,
    paddingRight: 8,
  },
  commentTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  commentText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    lineHeight: 20,
    flex: 1,
  },
  commentTimestamp: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 2,
  },
  likeButton: {
    padding: 8,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  inputAvatarContainer: {
    marginBottom: 4,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
    borderWidth: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.white.tertiary,
    opacity: 0.4,
  },
});
