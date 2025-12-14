import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import { useNotificationManager } from '../../hooks/useNotificationManager';
import GlassHeader from '../../components/layout/GlassHeader';
import { Colors } from '../../theme/colors';
import { formatTimestamp } from '../../utils/formatTimestamp';

/**
 * Notifications Screen
 * 
 * Displays notifications using useNotificationManager.
 * Zero Firestore code - uses global hooks.
 */
export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { notifications, fetchNotifications, markAsRead } = useNotificationManager();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
    }
  }, [user?.uid]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      await fetchNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = useCallback(async (notification: any) => {
    // Mark as read
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    if (notification.metadata?.postId) {
      navigation.navigate('PostDetails', { postId: notification.metadata.postId });
    } else if (notification.metadata?.conversationId) {
      // SINGLE NAVIGATION CONTRACT: Only chatId is required
      navigation.navigate('ChatRoom', { chatId: notification.metadata.conversationId });
    } else if (notification.type === 'follow') {
      navigation.navigate('Profile', { userId: notification.sourceUserId });
    }
  }, [markAsRead, navigation]);

  const renderNotificationItem = useCallback(({ item }: { item: any }) => {
    const isUnread = !item.read;

    const getNotificationIcon = () => {
      switch (item.type) {
        case 'like':
          return 'heart';
        case 'comment':
          return 'chatbubble';
        case 'follow':
          return 'person-add';
        case 'message':
          return 'mail';
        default:
          return 'notifications';
      }
    };

    const getNotificationTitle = () => {
      switch (item.type) {
        case 'like':
          return `${item.sourceUsername || 'Someone'} liked your post`;
        case 'comment':
          return `${item.sourceUsername || 'Someone'} commented on your post`;
        case 'follow':
          return `${item.sourceUsername || 'Someone'} started following you`;
        case 'message':
          return `${item.sourceUsername || 'Someone'} sent you a message`;
        default:
          return 'New notification';
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.notificationItemUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationIconContainer}>
          <Icon
            name={getNotificationIcon()}
            size={24}
            color={isUnread ? Colors.brand.primary : Colors.black.qua}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]}>
            {getNotificationTitle()}
          </Text>
          {item.metadata?.text && (
            <Text style={styles.notificationBody} numberOfLines={2}>
              {item.metadata.text}
            </Text>
          )}
          {item.timestamp && (
            <Text style={styles.notificationTime}>
              {formatTimestamp(item.timestamp)}
            </Text>
          )}
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }, [handleNotificationPress]);

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <GlassHeader
          title="Notifications"
          showBack={true}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <GlassHeader
        title="Notifications"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="notifications-off" size={64} color={Colors.black.qua} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.primary}
          />
        }
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyListContainer : undefined
        }
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.black.qua,
    marginTop: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.primary,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  notificationItemUnread: {
    borderColor: Colors.brand.primary,
    borderWidth: 1.5,
    backgroundColor: Colors.brand.accent + '10',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black.primary,
    marginBottom: 4,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  notificationBody: {
    fontSize: 14,
    color: Colors.black.secondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.black.qua,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand.primary,
    marginLeft: 12,
  },
});

