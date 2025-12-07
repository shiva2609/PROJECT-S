import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { listenToSavedPosts, Post } from '../api/firebaseService';
import { formatTimestamp } from '../utils/postHelpers';
import { normalizePost } from '../utils/postUtils';

export default function AccountScreen({ navigation }: any) {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = listenToSavedPosts(user.uid, (posts) => {
      setSavedPosts(posts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const renderPost = ({ item }: { item: Post }) => {
    // CRITICAL: Use ONLY final cropped bitmaps - NO fallback to original images
    // Normalize post to get mediaUrls (contains final rendered bitmap URLs)
    const normalizedPost = normalizePost(item as any);
    const mediaUrls = normalizedPost.mediaUrls || [];
    
    // Use first image from mediaUrls (final cropped bitmap) or finalCroppedUrl
    // DO NOT fallback to imageUrl or coverImage - those might be original images
    const imageUrl = mediaUrls[0] || (item as any).finalCroppedUrl || '';
    const username = item.username || 'User';
    const location = item.location || item.placeName || '';
    const timestamp = formatTimestamp(item.createdAt);

    return (
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.8}
        onPress={() => navigation?.navigate('PostDetail', { postId: item.id })}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
        ) : (
          <View style={[styles.postImage, styles.postImagePlaceholder]}>
            <Icon name="image-outline" size={32} color={Colors.black.qua} />
          </View>
        )}
        <View style={styles.postInfo}>
          <Text style={styles.postUsername} numberOfLines={1}>
            {username}
          </Text>
          {location ? (
            <View style={styles.locationRow}>
              <Icon name="location-outline" size={12} color={Colors.black.qua} />
              <Text style={styles.postLocation} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
          {timestamp ? <Text style={styles.postTimestamp}>{timestamp}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Saved Posts</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : savedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="bookmark-outline" size={64} color={Colors.black.qua} />
          <Text style={styles.emptyTitle}>No Saved Posts</Text>
          <Text style={styles.emptySub}>
            Posts you bookmark will appear here. Start exploring and save your favorite travel memories!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate('Explore')}
          >
            <Text style={styles.exploreButtonText}>Explore Posts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.postsGrid}
          columnWrapperStyle={styles.postRow}
          ListHeaderComponent={
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                Logout and Upgrade Account have been moved to the Side Menu.
              </Text>
              <Text style={styles.infoText}>
                Open the menu from the top-left corner to access these options.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.black.secondary,
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: Colors.white.primary,
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginBottom: 8,
    lineHeight: 20,
  },
  postsGrid: {
    padding: 12,
  },
  postRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postCard: {
    width: '48%',
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  postImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.white.tertiary,
  },
  postImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  postInfo: {
    padding: 10,
  },
  postUsername: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  postLocation: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    flex: 1,
  },
  postTimestamp: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
});
