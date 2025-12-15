import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import GlassHeader from '../../components/layout/GlassHeader';
import { Colors } from '../../theme/colors';
import { formatTimestamp } from '../../utils/formatTimestamp';
import {
  subscribeToAggregatedNotifications,
  AggregatedNotification,
  markNotificationsAsRead
} from '../../services/notifications/notificationService';
import { markNotificationAsRead } from '../../services/notifications/NotificationAPI';
import ProfileAvatar from '../../components/user/ProfileAvatar';
import FollowNotificationButton from '../../components/notifications/FollowNotificationButton';

/**
 * Notifications Screen (Aggregated)
 * 
 * Displays real-time aggregated notifications (Likes, Comments, Follows).
 * Messages are EXCLUDED.
 */
export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AggregatedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mark notifications as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.uid && notifications.length > 0) {
        markNotificationsAsRead(user.uid).catch(err =>
          console.error('Error marking notifications as read:', err)
        );
      }
    }, [user?.uid, notifications.length])
  );

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to aggregated notifications
    const unsubscribe = subscribeToAggregatedNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Real-time listener handles refresh automatically, 
    // but we can simulate a delay to show the spinner
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleNotificationPress = useCallback(async (item: AggregatedNotification) => {
    if (!user?.uid) return;

    // Mark as read
    if (!item.read) {
      try {
        if (item.docIds && item.docIds.length > 0) {
          // Mark all docs in this group as read
          await Promise.all(item.docIds.map(id => markNotificationAsRead(user.uid, id)));
        } else {
          // Fallback for types not using docIds
          await markNotificationAsRead(user.uid, item.id);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate
    if (item.type === 'follow') {
      // Navigate to the follower's profile
      const actorId = item.actors[0];
      if (actorId) {
        navigation.navigate('ProfileScreen', { userId: actorId });
      }
    } else if (item.targetId) {
      // Like or Comment -> Post Detail Feed
      // We pass userId = user.uid (ME) because I am the author of the post.
      navigation.navigate('PostDetail', {
        postId: item.targetId,
        userId: user.uid // Load MY feed
      });
    }
  }, [user?.uid, navigation]);

  const renderAvatars = (item: AggregatedNotification) => {
    // If we have avatars in metadata?
    // We only have actors IDs.
    // Try to use metadata sourceAvatarUri for the main actor.
    const mainAvatarUri = item.metadata?.sourceAvatarUri || item.metadata?.userAvatar || item.metadata?.actorAvatar;

    if (item.count > 1) {
      return (
        <View style={styles.avatarStack}>
          {/* Back Avatar (Generic or 2nd actor?) */}
          <View style={[styles.stackedAvatar, styles.avatarBack]}>
            <ProfileAvatar size={36} uri={null} />
          </View>
          {/* Front Avatar (Main actor) */}
          <View style={[styles.stackedAvatar, styles.avatarFront]}>
            <ProfileAvatar size={36} uri={mainAvatarUri} />
          </View>
        </View>
      );
    }

    // Single
    return (
      <View style={styles.singleAvatar}>
        <ProfileAvatar size={44} uri={mainAvatarUri} />
        {/* Icon Badge */}
        <View style={[styles.iconBadge, { backgroundColor: getIconColor(item.type) }]}>
          <Icon name={getIconName(item.type)} size={12} color={Colors.white.primary} />
        </View>
      </View>
    );
  };

  const getIconName = (type: string) => {
    switch (type) {
      case 'like': return 'heart';
      case 'comment': return 'chatbubble';
      case 'follow': return 'person-add';
      default: return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'like': return '#FF4B6C'; // Red/Pink
      case 'comment': return '#3D9BE9'; // Blue
      case 'follow': return '#7B61FF'; // Purple
      default: return Colors.brand.primary;
    }
  };

  const renderText = (item: AggregatedNotification) => {
    const username = item.sourceUsername || 'Someone';
    // Use the first actor ID for navigation
    const actorId = item.actors && item.actors.length > 0 ? item.actors[0] : null;

    const handleUsernamePress = (e?: any) => {
      e?.stopPropagation?.();
      if (actorId) {
        navigation.navigate('ProfileScreen', { userId: actorId });
      }
    };

    const isUnread = !item.read; // Simplistic
    const baseStyle = [styles.notificationBody, isUnread && styles.notificationBodyUnread];
    const usernameStyle = [styles.username, { color: Colors.black.primary }]; // Ensure text is distinct

    if (item.type === 'follow') {
      // For follow, the whole item navigates to profile, so we don't strictly need a separate handler,
      // but keeping it with stopPropagation is safer.
      return (
        <Text style={baseStyle}>
          <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> started following you.
        </Text>
      );
    }

    if (item.type === 'like') {
      if (item.count > 1) {
        return (
          <Text style={baseStyle}>
            <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> and <Text style={styles.bold}>{item.count - 1} others</Text> liked your post.
          </Text>
        );
      }
      return (
        <Text style={baseStyle}>
          <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> liked your post.
        </Text>
      );
    }

    if (item.type === 'comment') {
      if (item.count > 1) {
        return (
          <Text style={baseStyle}>
            <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> and <Text style={styles.bold}>{item.count - 1} others</Text> commented on your post.
          </Text>
        );
      }
      return (
        <Text style={baseStyle}>
          <Text style={usernameStyle} onPress={handleUsernamePress}>{username}</Text> commented: "{item.metadata?.text || 'Nice!'}"
        </Text>
      );
    }

    return <Text style={baseStyle}>New notification</Text>;
  };

  const renderNotificationItem = ({ item }: { item: AggregatedNotification }) => {
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.notificationItemUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Left: Avatars */}
        <View style={styles.leftContainer}>
          {renderAvatars(item)}
        </View>

        {/* Center: Text */}
        <View style={styles.contentContainer}>
          {renderText(item)}
          <Text style={styles.timeText}>{formatTimestamp(item.timestamp)}</Text>
        </View>

        {/* Right: Post Preview or Follow Button */}
        {item.previewImage ? (
          <Image source={{ uri: item.previewImage }} style={styles.postPreview} />
        ) : item.type === 'follow' && item.actors[0] ? (
          <FollowNotificationButton targetUserId={item.actors[0]} />
        ) : null}

      </TouchableOpacity>
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <GlassHeader title="Notifications" showBack={true} onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <GlassHeader title="Notifications" showBack={true} onBack={() => navigation.goBack()} />
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="heart-dislike-outline" size={64} color={Colors.black.qua} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.primary}
          />
        }
        contentContainerStyle={styles.listContent}
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
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
    paddingTop: 80, // Add padding to clear GlassHeader
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    marginTop: 16,
    color: Colors.black.tertiary,
    fontSize: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white.secondary,
    // borderBottomWidth: StyleSheet.hairlineWidth, // Removed borders as per style preference
    // borderBottomColor: Colors.white.tertiary,
    marginBottom: 4,
  },
  notificationItemUnread: {
    backgroundColor: Colors.brand.accent + '08', // Very subtle tint
    // Border left highlighter?
  },
  leftContainer: {
    marginRight: 12,
    justifyContent: 'center',
    width: 50,
  },
  contentContainer: {
    flex: 1,
    paddingRight: 8,
  },
  notificationBody: {
    fontSize: 14,
    color: Colors.black.primary,
    lineHeight: 20,
  },
  notificationBodyUnread: {
    fontWeight: '500', // Semi-bold for unread
  },
  username: {
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: Colors.black.qua,
    marginTop: 2,
  },
  postPreview: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: Colors.white.tertiary,
  },
  followButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followButtonText: {
    color: Colors.white.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  // Avatar Styling
  singleAvatar: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white.secondary,
  },
  avatarStack: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  stackedAvatar: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.white.secondary,
    borderRadius: 18,
  },
  avatarBack: {
    top: 0,
    left: 8,
    opacity: 0.6,
  },
  avatarFront: {
    bottom: 0,
    right: 8,
  },
});

