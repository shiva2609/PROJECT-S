import React, { useState, useEffect, useRef } from 'react';
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
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { listenToComments, addComment, Comment } from '../api/firebaseService';
import { formatTimestamp } from '../utils/postHelpers';
import { useProfilePhoto } from '../hooks/useProfilePhoto';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../services/userProfilePhotoService';

export default function CommentsScreen({ navigation, route }: any) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    const unsubscribe = listenToComments(postId, (commentsData) => {
      setComments(commentsData);
      setLoading(false);
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
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      // Get username from user profile or use email
      const username = user.displayName || user.email?.split('@')[0] || 'User';
      await addComment({
        postId,
        userId: user.uid,
        username,
        text,
      });
      setCommentText('');
      // Scroll to bottom after adding comment
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => {
    // Use unified profile photo hook
    const profilePhoto = useProfilePhoto(item.userId);
    const timestamp = formatTimestamp(item.createdAt);
    return (
      <View style={styles.commentItem}>
        {isDefaultProfilePhoto(profilePhoto) ? (
          <View style={styles.commentAvatar}>
            <Icon name="person" size={20} color={Colors.black.qua} />
          </View>
        ) : (
          <Image 
            source={{ uri: profilePhoto }} 
            defaultSource={{ uri: getDefaultProfilePhoto() }}
            onError={() => {
              // Offline/CDN failure - Image component will use defaultSource
            }}
            style={styles.commentAvatar} 
            resizeMode="cover"
          />
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{item.username || 'User'}</Text>
            {timestamp ? <Text style={styles.commentTimestamp}>{timestamp}</Text> : null}
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>
      </View>
    );
  };

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
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white.tertiary,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  commentUsername: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  commentTimestamp: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  commentText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    lineHeight: 20,
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

