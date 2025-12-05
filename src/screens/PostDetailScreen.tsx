import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../api/authService';
import { toggleLikePost, toggleBookmarkPost, toggleSharePost, Post } from '../api/firebaseService';
import { formatTimestamp, parseHashtags } from '../utils/postHelpers';

export default function PostDetailScreen({ navigation, route }: any) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    const postRef = doc(db, 'posts', postId);
    const unsubscribe = onSnapshot(postRef, (snapshot) => {
      if (snapshot.exists()) {
        const postData = { id: snapshot.id, ...snapshot.data() } as Post;
        setPost(postData);
        setIsLiked(user ? (postData.likedBy?.includes(user.uid) || false) : false);
        setIsSaved(user ? (postData.savedBy?.includes(user.uid) || false) : false);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading post:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, user]);

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to like posts');
      return;
    }
    try {
      const newIsLiked = await toggleLikePost(postId, user.uid);
      setIsLiked(newIsLiked);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to like post');
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to save posts');
      return;
    }
    try {
      const newIsSaved = await toggleBookmarkPost(postId, user.uid);
      setIsSaved(newIsSaved);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save post');
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      if (user) {
        await toggleSharePost(post.id, user.uid);
      }
      await Share.share({
        message: `${post.caption || 'Check out this post!'}\n${post.imageUrl}`,
        url: post.imageUrl,
      });
    } catch (error: any) {
      console.error('Error sharing post:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = post.imageUrl || post.coverImage || '';
  const profilePhoto = post.profilePhoto || '';
  const location = post.location || post.placeName || '';
  const username = post.username || 'User';
  const timestamp = formatTimestamp(post.createdAt);
  const captionParts = parseHashtags(post.caption || '');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Row */}
        <TouchableOpacity
          style={styles.profileRow}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Profile', { userId: post.userId || post.createdBy })}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileAvatar} />
          ) : (
            <View style={styles.profileAvatar}>
              <Icon name="person" size={24} color={Colors.black.qua} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{username}</Text>
            {location ? (
              <View style={styles.locationRow}>
                <Icon name="location-outline" size={12} color={Colors.black.qua} />
                <Text style={styles.locationText}>{location}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Post Image */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
        ) : (
          <View style={[styles.postImage, styles.postImagePlaceholder]}>
            <Icon name="image-outline" size={48} color={Colors.black.qua} />
          </View>
        )}

        {/* Engagement Strip */}
        <View style={styles.engagementStrip}>
          <TouchableOpacity style={styles.engagementButton} activeOpacity={0.7} onPress={handleLike}>
            <View style={styles.engagementIconContainer}>
              <Icon
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={Colors.black.primary}
              />
            </View>
            <Text style={styles.engagementText}>{post.likeCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.engagementButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Comments', { postId: post.id })}
          >
            <View style={styles.engagementIconContainer}>
              <Icon name="chatbubble-outline" size={24} color={Colors.black.primary} />
            </View>
            <Text style={styles.engagementText}>{post.commentCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.engagementButton} activeOpacity={0.7} onPress={handleShare}>
            <View style={styles.engagementIconContainer}>
              <Icon name="paper-plane-outline" size={24} color={Colors.black.primary} />
            </View>
            <Text style={styles.engagementText}>{post.shareCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.engagementButton} activeOpacity={0.7} onPress={handleBookmark}>
            <View style={styles.engagementIconContainer}>
              <Icon
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color={Colors.black.primary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {post.caption ? (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>
              {captionParts.map((part, index) => {
                if (part.isHashtag) {
                  return (
                    <Text key={index} style={styles.hashtag}>
                      {part.text}
                    </Text>
                  );
                }
                return <Text key={index}>{part.text}</Text>;
              })}
            </Text>
          </View>
        ) : null}

        {/* Timestamp */}
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  content: {
    flex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white.tertiary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  postImage: {
    width: '100%',
    height: 400,
    backgroundColor: Colors.white.tertiary,
  },
  postImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  engagementStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
    gap: 12,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementText: {
    color: Colors.black.primary,
    fontFamily: Fonts.medium,
    fontSize: 15,
    marginLeft: 4,
  },
  captionContainer: {
    padding: 16,
    backgroundColor: Colors.white.primary,
  },
  captionText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    lineHeight: 22,
  },
  hashtag: {
    color: Colors.brand.primary,
    fontFamily: Fonts.semibold,
  },
  timestamp: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    color: Colors.black.qua,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
});

