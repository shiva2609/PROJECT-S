/**
 * Notifications Screen
 * 
 * Displays all notifications with a special "Pending Actions" section
 * for notifications that require user action (like topic claiming).
 */

import React, { useState, useEffect } from 'react';
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
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../api/authService';
import {
  getPendingActionNotifications,
  markTopicReminderAsRead,
  NOTIFICATION_TYPE_TOPIC_REMINDER,
} from '../api/topicNotificationService';
import {
  markRewardNotificationAsClaimed,
  NOTIFICATION_TYPE_REWARD,
} from '../api/rewardNotificationService';
import { useRewardOnboarding } from '../hooks/useRewardOnboarding';
// Date formatting helper (no external dependency)

interface Notification {
  id: string;
  type: string;
  category?: string;
  title: string;
  body: string;
  read: boolean;
  isClaimed?: boolean; // For reward notifications
  points?: number; // For reward notifications
  createdAt?: any;
  timestamp?: number;
  actionUrl?: string;
  metadata?: any;
}

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingActions, setPendingActions] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get reward claim function for handling reward notifications
  const { grantReward } = useRewardOnboarding(user?.uid);

  /**
   * Load all notifications
   */
  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load all notifications
      const notificationsRef = collection(db, 'notifications');
      
      // Try with orderBy first, fallback to without if index doesn't exist
      let q;
      let snapshot;
      try {
        q = query(
          notificationsRef,
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexError: any) {
        // If index doesn't exist, fetch without orderBy and sort in memory
        console.log('⚠️ Composite index not found, fetching without orderBy and sorting in memory');
        q = query(
          notificationsRef,
          where('userId', '==', user.uid)
        );
        snapshot = await getDocs(q);
      }

      const allNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      // Sort by timestamp if not already sorted (fallback case)
      allNotifications.sort((a, b) => {
        const timeA = a.timestamp || a.createdAt?.toMillis?.() || 0;
        const timeB = b.timestamp || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA; // Descending order
      });

      // Separate pending actions
      const pending = allNotifications.filter(
        (n) => n.category === 'pending_actions' && !n.read
      );
      const regular = allNotifications.filter(
        (n) => n.category !== 'pending_actions' || n.read
      );

      setPendingActions(pending);
      setNotifications(regular);
    } catch (error: any) {
      console.error('❌ Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Set up real-time listener for notifications
   */
  useEffect(() => {
    if (!user) return;

    loadNotifications();

    // Set up real-time listener
    const notificationsRef = collection(db, 'notifications');
    
    // Try with orderBy first, fallback to without if index doesn't exist
    let q;
    try {
      q = query(
        notificationsRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
    } catch (indexError) {
      // If index doesn't exist, query without orderBy
      console.log('⚠️ Composite index not found, using query without orderBy');
      q = query(
        notificationsRef,
        where('userId', '==', user.uid)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allNotifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        // Sort by timestamp (in case orderBy wasn't used)
        allNotifications.sort((a, b) => {
          const timeA = a.timestamp || a.createdAt?.toMillis?.() || 0;
          const timeB = b.timestamp || b.createdAt?.toMillis?.() || 0;
          return timeB - timeA; // Descending order
        });

        const pending = allNotifications.filter(
          (n) => n.category === 'pending_actions' && !n.read
        );
        const regular = allNotifications.filter(
          (n) => n.category !== 'pending_actions' || n.read
        );

        setPendingActions(pending);
        setNotifications(regular);
        setLoading(false);
      },
      (error: any) => {
        console.error('❌ Error listening to notifications:', error);
        
        // If error is about missing index, try without orderBy
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          console.log('⚠️ Retrying without orderBy due to missing index');
          const fallbackQ = query(
            notificationsRef,
            where('userId', '==', user.uid)
          );
          
          onSnapshot(
            fallbackQ,
            (snapshot) => {
              const allNotifications = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as Notification[];

              // Sort in memory
              allNotifications.sort((a, b) => {
                const timeA = a.timestamp || a.createdAt?.toMillis?.() || 0;
                const timeB = b.timestamp || b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
              });

              const pending = allNotifications.filter(
                (n) => n.category === 'pending_actions' && !n.read
              );
              const regular = allNotifications.filter(
                (n) => n.category !== 'pending_actions' || n.read
              );

              setPendingActions(pending);
              setNotifications(regular);
              setLoading(false);
            },
            (fallbackError) => {
              console.error('❌ Error with fallback query:', fallbackError);
              setLoading(false);
            }
          );
        } else {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  /**
   * Handle notification press
   */
  const handleNotificationPress = async (notification: Notification) => {
    // Handle reward notification - navigate to Home and show claim modal
    const isRewardClaimed = notification.isClaimed || notification.metadata?.isClaimed;
    if (notification.type === NOTIFICATION_TYPE_REWARD && !isRewardClaimed) {
      try {
        console.log('🎁 Navigating to Home to claim reward from notification...');
        
        // Navigate to home screen first (don't claim yet - let user claim from modal)
        // Pass a parameter to indicate we should show the reward modal
        if (notification.actionUrl === 'Home' || !notification.actionUrl) {
          // Navigate to MainTabs and then to Home tab with showReward param
          navigation.navigate('MainTabs', { 
            screen: 'Home',
            params: { showReward: true }
          });
        } else {
          navigation.navigate(notification.actionUrl, { showReward: true });
        }
        
        // Note: Reward will be shown in modal on Home screen via useFocusEffect
        // User can then claim it from the modal
        // The notification will be marked as claimed when user actually claims the reward
        
        return; // Exit early after handling reward notification
      } catch (error) {
        console.error('❌ Error navigating to claim reward:', error);
        // Still navigate even if there's an error
        if (notification.actionUrl) {
          navigation.navigate(notification.actionUrl);
        } else {
          navigation.navigate('MainTabs', { screen: 'Home' });
        }
        return;
      }
    }

    // Mark as read for other notification types
    if (!notification.read) {
      try {
        const notificationRef = doc(db, 'notifications', notification.id);
        await updateDoc(notificationRef, {
          read: true,
          readAt: serverTimestamp(),
        });

        // If it's a topic reminder, also use the service function
        if (notification.type === NOTIFICATION_TYPE_TOPIC_REMINDER) {
          await markTopicReminderAsRead(user?.uid || '', notification.id);
        }
      } catch (error) {
        console.error('❌ Error marking notification as read:', error);
      }
    }

    // Navigate if action URL is provided
    if (notification.actionUrl) {
      navigation.navigate(notification.actionUrl);
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp?: number | any): string => {
    if (!timestamp) return '';

    let date: Date;
    if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
      date = new Date(timestamp.toMillis());
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      return '';
    }

    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      // Format: "Jan 15, 2:30 PM"
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const mins = minutes < 10 ? `0${minutes}` : minutes;
      return `${month} ${day}, ${hours}:${mins} ${ampm}`;
    } catch {
      return '';
    }
  };

  /**
   * Render notification item
   */
  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.read;
    const isPendingAction = item.category === 'pending_actions';
    const isReward = item.type === NOTIFICATION_TYPE_REWARD;
    const isClaimed = item.metadata?.isClaimed || item.isClaimed;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.notificationItemUnread,
          isPendingAction && styles.notificationItemPending,
          isReward && !isClaimed && styles.notificationItemReward,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationBody}>{item.body}</Text>
          {isReward && !isClaimed && (
            <View style={styles.rewardBadge}>
              <Icon name="gift" size={14} color={Colors.brand.primary} />
              <Text style={styles.rewardBadgeText}>
                {item.metadata?.rewardPoints || item.points || 150} Points
              </Text>
            </View>
          )}
          {item.timestamp && (
            <Text style={styles.notificationTime}>
              {formatTimestamp(item.timestamp)}
            </Text>
          )}
        </View>
        <Icon
          name="chevron-forward"
          size={20}
          color={Colors.black.qua}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  };

  /**
   * Render pending actions section
   */
  const renderPendingActionsSection = () => {
    if (pendingActions.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="alert-circle" size={20} color={Colors.accent.amber} />
          <Text style={styles.sectionTitle}>Pending Actions</Text>
        </View>
        <FlatList
          data={pendingActions}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>
    );
  };

  if (loading && notifications.length === 0 && pendingActions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {/* Content */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderPendingActionsSection}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="notifications-off" size={64} color={Colors.black.qua} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            tintColor={Colors.brand.primary}
          />
        }
        contentContainerStyle={
          notifications.length === 0 && pendingActions.length === 0
            ? styles.emptyListContainer
            : undefined
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
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
    backgroundColor: Colors.brand.accent + '10', // 10% opacity
  },
  notificationItemPending: {
    borderColor: Colors.accent.amber,
    borderWidth: 1.5,
  },
  notificationItemReward: {
    borderColor: Colors.brand.primary,
    borderWidth: 1.5,
    backgroundColor: Colors.brand.accent + '10', // 10% opacity
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand.primary,
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 4,
  },
  chevron: {
    marginLeft: 12,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.brand.accent + '20', // 20% opacity
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rewardBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
});

