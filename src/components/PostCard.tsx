import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { likePost, unlikePost, bookmarkPost, unbookmarkPost, sharePost } from '../api/firebaseService';
import { db } from '../api/authService';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

interface PostCardProps {
  post: {
    id: string;
    createdBy: string;
    userId?: string;
    username?: string;
    imageUrl?: string;
    imageURL?: string;
    coverImage?: string;
    caption?: string;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    likedBy?: string[];
    savedBy?: string[];
    sharedBy?: string[];
    createdAt: any;
    metadata?: {
      location?: string;
    };
    placeName?: string;
  };
  onUserPress?: (userId: string) => void;
  onViewDetails?: (postId: string) => void;
  onCommentPress?: (postId: string) => void;
  navigation?: any;
}

export default function PostCard({
  post,
  onUserPress,
  onViewDetails,
  onCommentPress,
  navigation,
}: PostCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string>('');
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  // Get image URL
  const imageUrl = post.imageUrl || post.imageURL || post.coverImage;

  // Initialize state from post data
  useEffect(() => {
    const likedBy = post.likedBy || [];
    const savedBy = post.savedBy || [];
    const sharedBy = post.sharedBy || [];
    
    setLikeCount(likedBy.length);
    if (user) {
      setIsLiked(likedBy.includes(user.uid));
    }
    if (user) {
      setIsBookmarked(savedBy.includes(user.uid));
    }
    setShareCount(sharedBy.length);
  }, [post.likedBy, post.savedBy, post.sharedBy, user]);

  // Listen to post updates in real-time
  useEffect(() => {
    const postRef = doc(db, 'posts', post.id);
    const unsubscribe = onSnapshot(postRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const likedBy = data.likedBy || [];
        const savedBy = data.savedBy || [];
        const sharedBy = data.sharedBy || [];
        
        // Update like count from array length
        setLikeCount(likedBy.length);
        if (user) {
          setIsLiked(likedBy.includes(user.uid));
        }
        
        // Update bookmark state
        if (user) {
          setIsBookmarked(savedBy.includes(user.uid));
        }
        
        // Update share count from array length
        setShareCount(sharedBy.length);
      }
    }, (error) => {
      console.error('Error listening to post updates:', error);
    });

    return () => unsubscribe();
  }, [post.id, user]);

  // Fetch and listen to comment count from Firestore
  useEffect(() => {
    // Initial fetch
    const fetchCommentCount = async () => {
      try {
        const commentsRef = collection(db, 'comments');
        const q = query(commentsRef, where('postId', '==', post.id));
        const snapshot = await getDocs(q);
        setCommentCount(snapshot.size);
      } catch (error) {
        console.error('Error fetching comment count:', error);
        // Fallback to post.commentCount if available
        setCommentCount(post.commentCount || 0);
      }
    };

    fetchCommentCount();
    
    // Listen to comments in real-time
    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef, where('postId', '==', post.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCommentCount(snapshot.size);
    }, (error) => {
      console.error('Error listening to comments:', error);
    });

    return () => unsubscribe();
  }, [post.id]);

  // Get image aspect ratio
  useEffect(() => {
    if (imageUrl) {
      Image.getSize(
        imageUrl,
        (width, height) => {
          setImageAspectRatio(width / height);
        },
        (error) => {
          console.error('Error getting image size:', error);
          // Default to 1:1 if we can't get the size
          setImageAspectRatio(1);
        }
      );
    }
  }, [imageUrl]);

  // Fetch user photo and location
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = post.createdBy || post.userId;
        if (!userId) return;

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.photoURL) {
            setUserPhoto(userData.photoURL);
          }
          if (userData.location) {
            setUserLocation(userData.location);
          } else if (post.metadata?.location) {
            setUserLocation(post.metadata.location);
          } else if (post.placeName) {
            setUserLocation(post.placeName);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [post.createdBy, post.userId]);

  // Format timestamp
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        return '';
      }

      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
      if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      
      return 'Just now';
    } catch (error) {
      return '';
    }
  };

  // Extract hashtags from caption
  const renderCaption = () => {
    if (!post.caption) return null;

    const parts = post.caption.split(/(#\w+)/g);
    return (
      <Text style={styles.caption}>
        {parts.map((part, index) => {
          if (part.startsWith('#')) {
            return (
              <Text
                key={index}
                style={styles.hashtag}
                onPress={() => {
                  // Navigate to hashtag search if needed
                  console.log('Hashtag pressed:', part);
                }}
              >
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const handleLike = async () => {
    if (!user) return;

    try {
      // Check current state from Firestore
      const postRef = doc(db, 'posts', post.id);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      
      const data = postSnap.data();
      const likedBy = data.likedBy || [];
      const currentlyLiked = likedBy.includes(user.uid);
      
      if (currentlyLiked) {
        await unlikePost(post.id, user.uid);
      } else {
        await likePost(post.id, user.uid);
      }
      // State will update via onSnapshot listener
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleBookmark = async () => {
    if (!user) return;

    try {
      if (isBookmarked) {
        await unbookmarkPost(post.id, user.uid);
        setIsBookmarked(false);
      } else {
        await bookmarkPost(post.id, user.uid);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (!user) return;
      
      // Add user to sharedBy array
      const postRef = doc(db, 'posts', post.id);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      
      const data = postSnap.data();
      const sharedBy = data.sharedBy || [];
      
      if (!sharedBy.includes(user.uid)) {
        await sharePost(post.id, user.uid);
      }

      const shareUrl = `https://sanchari.app/post/${post.id}`;
      await Share.share({
        message: post.caption || 'Check out this post on Sanchari!',
        url: shareUrl,
        title: 'Share Post',
      });
      // Share count will update via onSnapshot listener
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing post:', error);
      }
    }
  };

  const handleUserPress = () => {
    const userId = post.createdBy || post.userId;
    if (userId && onUserPress) {
      onUserPress(userId);
    }
  };

  const username = post.username || post.createdBy?.slice(0, 10) || 'User';
  const location = userLocation || post.metadata?.location || post.placeName || '';

  return (
    <View style={styles.container}>
      {/* Post Image */}
      {imageUrl && (
        <View style={styles.postImageContainer}>
          <Image 
            source={{ uri: imageUrl }} 
            style={[
              styles.postImage,
              imageAspectRatio && { aspectRatio: imageAspectRatio }
            ]} 
            resizeMode="cover" 
          />
        </View>
      )}

      {/* Profile Row with View Details Button */}
      <View style={styles.profileRow}>
        <TouchableOpacity style={styles.profileInfo} onPress={handleUserPress} activeOpacity={0.7}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Text style={styles.profilePhotoText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profileTextContainer}>
            <Text style={styles.username}>{username}</Text>
            {location && (
              <View style={styles.locationRow}>
                <Icon name="location-outline" size={12} color={Colors.black.qua} />
                <Text style={styles.location}>{location}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => onViewDetails && onViewDetails(post.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>

      {/* Engagement Strip */}
      <View style={styles.engagementStrip}>
        <View style={styles.engagementLeft}>
          <TouchableOpacity style={styles.engagementButton} onPress={handleLike} activeOpacity={0.7}>
            <Icon
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? Colors.accent.red : Colors.black.secondary}
            />
            <Text style={styles.engagementText}>{likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.engagementButton}
            onPress={() => onCommentPress && onCommentPress(post.id)}
            activeOpacity={0.7}
          >
            <Icon name="chatbubble-ellipses-outline" size={20} color={Colors.black.secondary} />
            <Text style={styles.engagementText}>{commentCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementButton} onPress={handleShare} activeOpacity={0.7}>
            <Icon name="paper-plane-outline" size={20} color={Colors.black.secondary} />
            <Text style={styles.engagementText}>{shareCount}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleBookmark} activeOpacity={0.7}>
          <Icon
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isBookmarked ? Colors.brand.primary : Colors.black.secondary}
          />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.moreButton}>
          <Icon name="ellipsis-horizontal" size={20} color={Colors.black.secondary} />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {renderCaption()}

      {/* Timestamp */}
      <Text style={styles.timestamp}>{formatTimestamp(post.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white.primary,
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  postImageContainer: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.white.tertiary,
  },
  postImage: {
    width: '100%',
    backgroundColor: Colors.white.tertiary,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white.tertiary,
    marginRight: 10,
  },
  profilePhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoText: {
    color: Colors.white.primary,
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  profileTextContainer: {
    flex: 1,
  },
  username: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.black.primary,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.black.qua,
  },
  viewDetailsButton: {
    backgroundColor: '#F9CBAF', // Peach color
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewDetailsText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: Colors.black.primary,
  },
  engagementStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.black.secondary,
  },
  moreButton: {
    marginLeft: 16,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.black.primary,
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 20,
  },
  hashtag: {
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
  },
  timestamp: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.black.qua,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

