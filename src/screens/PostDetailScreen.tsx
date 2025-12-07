import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { toggleLikePost, toggleBookmarkPost, toggleSharePost, Post } from '../api/firebaseService';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../api/authService';
import { normalizePost } from '../utils/postUtils';
import PostCard from '../components/PostCard';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function PostDetailScreen({ navigation, route }: any) {
  const { posts, index, postId } = route.params || {};
  const { user } = useAuth();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [singlePost, setSinglePost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [initialIndex, setInitialIndex] = useState(index || 0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const [hasScrolled, setHasScrolled] = useState(false);
  const [removedPostIds, setRemovedPostIds] = useState<Set<string>>(new Set());

  // If only postId is provided, fetch the post from Firestore
  useEffect(() => {
    if (postId && (!posts || !Array.isArray(posts) || posts.length === 0)) {
      setLoading(true);
      const postRef = doc(db, 'posts', postId);
      const unsubscribe = onSnapshot(postRef, (snapshot) => {
        if (snapshot.exists()) {
          const postData = { id: snapshot.id, ...snapshot.data() } as Post;
          const normalizedPost = normalizePost(postData);
          setSinglePost(normalizedPost as Post);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error loading post:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [postId, posts]);

  // If only postId is provided, we need to fetch the post
  // Otherwise, use the posts array from params
  // IMPORTANT: Posts are ordered by createdAt DESC (newest first) from HomeScreen
  // So posts[0] = newest, posts[1] = older, etc.
  // Instagram-style: Scroll UP = newer posts (lower indices), Scroll DOWN = older posts (higher indices)
  const postsArray = useMemo(() => {
    let allPosts: Post[] = [];
    
    if (posts && Array.isArray(posts) && posts.length > 0) {
      // Ensure posts are sorted by createdAt DESC (newest first) for consistent scrolling
      const sorted = [...posts].sort((a, b) => {
        const aTime = a.createdAt || 0;
        const bTime = b.createdAt || 0;
        return bTime - aTime; // Descending order (newest first)
      });
      allPosts = sorted;
    } else if (singlePost) {
      // If single post was fetched, return it as array
      allPosts = [singlePost];
    }
    
    // Filter out removed posts
    return allPosts.filter((p) => !removedPostIds.has(p.id));
  }, [posts, singlePost, removedPostIds]);

  // Fetch liked and saved posts status
  useEffect(() => {
    if (!user || postsArray.length === 0) return;

    const likedSet = new Set<string>();
    const savedSet = new Set<string>();

    postsArray.forEach((post: Post) => {
      if (post.likedBy?.includes(user.uid)) {
        likedSet.add(post.id);
      }
      if (post.savedBy?.includes(user.uid)) {
        savedSet.add(post.id);
      }
    });

    setLikedPosts(likedSet);
    setSavedPosts(savedSet);
  }, [user, postsArray]);

  // Find target index for the clicked post
  const targetIndex = useMemo(() => {
    if (postId && postsArray.length > 0) {
      const foundIndex = postsArray.findIndex((p) => p.id === postId);
      if (foundIndex >= 0) return foundIndex;
    }
    if (initialIndex >= 0 && initialIndex < postsArray.length) {
      return initialIndex;
    }
    return 0;
  }, [postId, postsArray, initialIndex]);

  // Calculate scroll offset based on item heights
  const calculateScrollOffset = useMemo(() => {
    if (postsArray.length === 0) return 0;
    
    // Calculate offset by summing heights of items before target
    let offset = 0;
    for (let i = 0; i < targetIndex && i < postsArray.length; i++) {
      // Use actual height if available, otherwise use estimated
      const height = itemHeights.get(i) || 600; // Default estimated height
      offset += height;
    }
    
    return offset;
  }, [postsArray, targetIndex, itemHeights]);

  // Scroll to initial index when FlatList is ready
  useEffect(() => {
    if (flatListRef.current && postsArray.length > 0 && !hasScrolled) {
      // Wait for some items to render and measure
      const timer = setTimeout(() => {
        if (flatListRef.current) {
          const scrollOffset = calculateScrollOffset;
          if (scrollOffset >= 0) {
            flatListRef.current.scrollToOffset({
              offset: scrollOffset,
              animated: false,
            });
            setHasScrolled(true);
          }
        }
      }, 500); // Increased delay to allow items to measure
      
      return () => clearTimeout(timer);
    }
  }, [postsArray.length, calculateScrollOffset, hasScrolled]);

  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      const newIsLiked = await toggleLikePost(postId, user.uid);
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (newIsLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!user) return;
    try {
      const newIsSaved = await toggleBookmarkPost(postId, user.uid);
      setSavedPosts((prev) => {
        const newSet = new Set(prev);
        if (newIsSaved) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleShare = async (post: Post) => {
    if (!user) return;
    try {
      await toggleSharePost(post.id, user.uid);
    } catch (error: any) {
      console.error('Error sharing post:', error);
    }
  };

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // Fetch following IDs
  useEffect(() => {
    if (!user) return;

    const followsRef = collection(db, 'follows');
    const followsQuery = query(followsRef, where('followerId', '==', user.uid));
    const unsubscribeFollows = onSnapshot(followsQuery, (snapshot) => {
      const ids = new Set(snapshot.docs.map(doc => doc.data().followingId));
      setFollowingIds(ids);
    }, (error: any) => {
      console.warn('Error fetching following IDs:', error.message || error);
    });

    return () => unsubscribeFollows();
  }, [user]);

  const handlePostRemoved = (postId: string) => {
    // Optimistic: Mark post as removed
    setRemovedPostIds((prev) => new Set(prev).add(postId));
    // If this was the current post, navigate back
    if (singlePost?.id === postId) {
      navigation.goBack();
    }
  };

  const renderPost = ({ item, index: itemIndex }: { item: Post; index: number }) => {
    const isLiked = likedPosts.has(item.id);
    const isSaved = savedPosts.has(item.id);
    const postAuthorId = item.createdBy || item.userId;
    const isFollowing = postAuthorId ? followingIds.has(postAuthorId) : false;
    // In PostDetailScreen, we can't determine if it's "For You" or "Following"
    // Default to false (Following) since detail screens usually show from Following feed
    const inForYou = false;

    return (
      <View
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0) {
            setItemHeights((prev) => {
              const newMap = new Map(prev);
              newMap.set(itemIndex, height);
              return newMap;
            });
          }
        }}
      >
        <PostCard
          post={item}
          isLiked={isLiked}
          isSaved={isSaved}
          onLike={() => handleLike(item.id)}
          onComment={() => navigation.navigate('Comments', { postId: item.id })}
          onShare={() => handleShare(item)}
          onBookmark={() => handleBookmark(item.id)}
          onProfilePress={() => navigation.push('ProfileScreen', { userId: item.createdBy || item.userId })}
          onPostDetailPress={() => {
            // In detail screen, clicking post detail does nothing (already in detail view)
            // Or could scroll to that post if it's in the list
          }}
          currentUserId={user?.uid}
          isFollowing={isFollowing}
          inForYou={inForYou}
          onPostRemoved={handlePostRemoved}
        />
      </View>
    );
  };

  if (loading || postsArray.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts</Text>
        <View style={styles.headerBackButton} />
      </View>

      <FlatList
        ref={flatListRef}
        data={postsArray}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        initialScrollIndex={targetIndex >= 0 && targetIndex < postsArray.length ? targetIndex : 0}
        // Use getItemLayout with estimated heights for better scroll performance
        getItemLayout={(data, index) => {
          const height = itemHeights.get(index) || 600; // Default estimated height
          // Calculate offset by summing previous item heights
          let offset = 0;
          for (let i = 0; i < index; i++) {
            offset += itemHeights.get(i) || 600;
          }
          return {
            length: height,
            offset: offset,
            index,
          };
        }}
        removeClippedSubviews={true}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // Instagram-style scrolling: Scroll UP = newer posts (lower indices), Scroll DOWN = older posts (higher indices)
        // Posts are already sorted by createdAt DESC (newest first), so this works correctly
        onScrollToIndexFailed={(info) => {
          // Fallback: use offset-based scroll
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            if (flatListRef.current) {
              const offset = calculateScrollOffset;
              flatListRef.current.scrollToOffset({
                offset: offset,
                animated: false,
              });
            }
          });
        }}
      />
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
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 0,
  },
});
