/**
 * Posts Grid Component
 * 
 * 3-column grid layout for displaying posts
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Post } from '../../hooks/useProfileData';
import { normalizePost } from '../../utils/postUtils';

interface PostsGridProps {
  posts: Post[];
  onPostPress?: (post: Post) => void;
}

const { width } = Dimensions.get('window');
const POST_SIZE = (width - 32 - 4) / 3; // 3 columns with 2px gaps

export default function PostsGrid({ posts, onPostPress }: PostsGridProps) {
  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No posts yet</Text>
        <Text style={styles.emptySubtext}>Start sharing your travel adventures!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {posts.map((post, index) => {
        // CRITICAL: Use ONLY final cropped bitmaps - NO fallback to original images
        // Normalize post to get mediaUrls (contains final rendered bitmap URLs)
        const normalizedPost = normalizePost(post as any);
        const mediaUrls = normalizedPost.mediaUrls || [];
        
        // Use first image from mediaUrls (final cropped bitmap) or finalCroppedUrl
        // DO NOT fallback to imageUrl, coverImage, or gallery - those might be original images
        const thumbnailUrl = mediaUrls[0] || (post as any).finalCroppedUrl || '';
        const hasMultipleImages = mediaUrls.length > 1;
        
        return (
          <TouchableOpacity
            key={post.id}
            style={[styles.postItem, { marginRight: index % 3 === 2 ? 0 : 2 }]}
            onPress={() => onPostPress?.(post)}
            activeOpacity={0.9}
          >
            {thumbnailUrl ? (
              <>
                <Image 
                  source={{ uri: thumbnailUrl }} 
                  style={styles.postImage}
                  resizeMode="cover"
                />
                {/* Multiple images indicator */}
                {hasMultipleImages && (
                  <View style={styles.multipleImagesIndicator}>
                    <Icon name="layers" size={16} color={Colors.white.primary} />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.postPlaceholder}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#F8F5F1',
  },
  postItem: {
    width: POST_SIZE,
    height: POST_SIZE,
    marginBottom: 2,
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
  },
  postPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#F8F5F1',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.black.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.black.qua,
    textAlign: 'center',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

