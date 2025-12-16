import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../../theme/colors';
import { Fonts } from '../../../theme/fonts';
import { useAuth } from '../../../providers/AuthProvider';
import { useUser } from '../../../global/hooks/useUser';
import { useUnifiedFollow } from '../../../hooks/useUnifiedFollow';
import { usePostActions } from '../../../utils/postActions';
import PostCard from '../../../components/post/PostCard';
import type { Post } from '../../../types/firestore';
import type { PostWithAuthor } from '../../../global/services/posts/post.service';

/**
 * Post Detail Feed Screen (Instagram-style)
 * 
 * Displays a feed of posts starting from a specific post.
 * Allows vertical scrolling through the user's feed.
 * 
 * Params:
 * - userId: string (Required to fetch feed context)
 * - postId: string (The clicked post to focus on)
 * - posts: Post[] (Optional: pre-fetched posts from Profile)
 * - index: number (Optional: index of clicked post)
 */
export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user: currentUser } = useAuth();

  // Params
  const { userId, postId, posts: paramPosts, index: paramIndex } = route.params || {};

  // Fetch user data if needed (for feed context and author info)
  // If posts are passed, we still might want "user" info for the header or author mapping
  const { user: authorUser, posts: fetchedPosts, loading: userLoading } = useUser(userId, {
    listenPosts: !paramPosts
  });

  const { toggleFollow: handleFollowUser } = useUnifiedFollow();

  // Determine posts source
  const [displayedPosts, setDisplayedPosts] = useState<PostWithAuthor[]>([]);
  const [initialIndex, setInitialIndex] = useState<number>(0);
  const [ready, setReady] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollFailedRef = useRef(false);

  // Map raw posts to PostWithAuthor
  const mapPostsToWithAuthor = useCallback((rawPosts: Post[], author: any): PostWithAuthor[] => {
    if (!author) return rawPosts as any;
    return rawPosts.map(p => ({
      ...p,
      username: author.username || 'User',
      authorId: author.uid || userId, // Ensure authorId is set
      authorUsername: author.username || 'User',
      authorAvatar: author.photoURL || author.profilePhoto || author.profilePic,
      user: {
        id: author.uid || userId,
        username: author.username,
        photoURL: author.photoURL || author.profilePhoto
      }
    })) as PostWithAuthor[];
  }, [userId]);

  useEffect(() => {
    let finalPosts: PostWithAuthor[] = [];

    if (paramPosts) {
      // Use passed posts (already mapped or need mapping?)
      // Profile screen usually passes Post object. 
      // If we came from Profile, we likely have author info in the Post object or separate context.
      // But typically Profile passes the raw Post list from useUser.
      finalPosts = mapPostsToWithAuthor(paramPosts, authorUser);
    } else if (fetchedPosts.length > 0) {
      // Use fetched posts
      finalPosts = mapPostsToWithAuthor(fetchedPosts, authorUser);
    }

    if (finalPosts.length > 0) {
      // Find index
      let foundIndex = 0;
      if (typeof paramIndex === 'number') {
        foundIndex = paramIndex;
      } else if (postId) {
        foundIndex = finalPosts.findIndex(p => p.id === postId);
        if (foundIndex === -1) foundIndex = 0; // Fallback
      }

      setDisplayedPosts(finalPosts);
      setInitialIndex(foundIndex);

      // Delay showing the list slightly to ensure layout engine is ready to jump
      // or simply rely on initialScrollIndex now that separate state is confirmed
      setReady(true);
    }
  }, [paramPosts, fetchedPosts, authorUser, paramIndex, postId, mapPostsToWithAuthor]);


  // Post Actions
  const updatePost = useCallback((pId: string, updates: Partial<PostWithAuthor>) => {
    setDisplayedPosts(prev =>
      prev.map(p => p.id === pId ? { ...p, ...updates } : p)
    );
  }, []);

  const postActions = usePostActions((pId, updates) => {
    const currentPost = displayedPosts.find(p => p.id === pId);
    if (!currentPost) return;

    const newUpdates: any = {};
    if (typeof updates.likeCount === 'function') newUpdates.likeCount = updates.likeCount(currentPost.likeCount);
    else if (updates.likeCount !== undefined) newUpdates.likeCount = updates.likeCount;

    if (typeof updates.commentCount === 'function') newUpdates.commentCount = updates.commentCount(currentPost.commentCount);
    else if (updates.commentCount !== undefined) newUpdates.commentCount = updates.commentCount;

    if (updates.isLiked !== undefined) newUpdates.isLiked = updates.isLiked;
    if (updates.isSaved !== undefined) newUpdates.isSaved = updates.isSaved;

    updatePost(pId, newUpdates);
  });

  const handleLike = useCallback(async (pId: string, isLiked?: boolean) => {
    await postActions.toggleLike(pId, isLiked, () => { });
  }, [postActions]);

  const handleSave = useCallback(async (pId: string, isSaved?: boolean) => {
    await postActions.toggleSave(pId, isSaved, () => { });
  }, [postActions]);

  const handleFollow = useCallback(async (targetId: string) => {
    await handleFollowUser(targetId);
  }, [handleFollowUser]);


  // Error handling for scrolling
  const onScrollToIndexFailed = (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
    console.warn("Scroll to index failed", info);
    scrollFailedRef.current = true;
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: info.index, animated: false });
      }
    }, 100);
  };

  const renderItem = useCallback(({ item }: { item: PostWithAuthor }) => {
    // Ensure author info is present for PostCard
    const postForCard = {
      ...item,
      authorId: item.authorId || userId,
      username: item.username || authorUser?.username || 'User',
      profilePhoto: item.authorAvatar || authorUser?.photoURL,
      // Interactions are local to displayedPosts state
    };

    return (
      <PostCard
        post={postForCard as any}
        isLiked={item.isLiked || false}
        isSaved={item.isSaved || false}
        onLike={() => handleLike(item.id, item.isLiked)}
        onComment={() => {
          navigation.navigate('Comments', { postId: item.id });
        }}
        onShare={() => postActions.sharePost(item as any)}
        onBookmark={() => handleSave(item.id, item.isSaved)}
        onProfilePress={() => navigation.navigate('ProfileScreen', { userId: item.authorId || userId })}
        currentUserId={currentUser?.uid}
        // If viewing MY feed, I am following myself (so hide button?), or just hide follow button entirely in detail view unless it's feed style
        // Instagram shows follow button on single post view if not following. 
        // Here we are in a feed of a specific user. 
        showFollowButton={currentUser?.uid !== (item.authorId || userId)}
        isFollowing={false} // Todo: wire up specific follow status per post author if needed. But usually this feed is ONE author.
        onFollow={handleFollow}
        onPostDetailPress={() => { }} // Already here
      />
    );
  }, [handleLike, handleSave, postActions, navigation, currentUser?.uid, userId, authorUser, handleFollow]);

  // IMPORTANT: Only render FlatList when ready to index
  if (!ready && !paramPosts && userLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </SafeAreaView>
    );
  }

  // If we have posts but not ready (computing index), show spinner or empty?
  // Actually, wait for ready state to avoid jump.
  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {authorUser?.username ? `${authorUser.username}'s Posts` : 'Posts'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Feed */}
      <FlatList
        ref={flatListRef}
        data={displayedPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={onScrollToIndexFailed}
        // REMOVED getItemLayout to avoid inaccurate offsets causing index 0 fallback
        contentContainerStyle={styles.listContent}
        windowSize={5}
        maxToRenderPerBatch={5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderBottomColor: Colors.white.secondary,
  },
  backButton: {
    width: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  listContent: {
    paddingBottom: 20,
  },
});
