import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../providers/AuthProvider';
import GlassHeader from '../../components/layout/GlassHeader';
import { Colors } from '../../theme/colors';
import {
  subscribeToAggregatedNotifications,
  AggregatedNotification,
  markNotificationsAsRead
} from '../../services/notifications/notificationService';
import { markNotificationAsRead } from '../../services/notifications/NotificationAPI';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import NotificationItem from '../../components/notifications/NotificationItem';

/**
 * Notifications Screen (Aggregated)
 * 
 * Displays real-time aggregated notifications (Likes, Comments, Follows).
 * Messages are EXCLUDED.
 * 
 * ⚡ PERFORMANCE OPTIMIZED
 */
export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AggregatedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mark all as read on focus
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

    const unsubscribe = subscribeToAggregatedNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  // Handle refresh timer cleanup
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (refreshing) {
      timer = setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [refreshing]);

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('ProfileScreen', { userId });
  }, [navigation]);

  const handleNotificationPress = useCallback(async (item: AggregatedNotification) => {
    if (!user?.uid) return;

    // Mark as read (optimistic/backend)
    if (!item.read) {
      try {
        if (item.docIds && item.docIds.length > 0) {
          await Promise.all(item.docIds.map(id => markNotificationAsRead(user.uid!, id)));
        } else {
          await markNotificationAsRead(user.uid!, item.id);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigation
    if (item.type === 'follow') {
      const actorId = item.actors[0];
      if (actorId) {
        navigation.navigate('ProfileScreen', { userId: actorId });
      }
    } else if (item.targetId) {
      navigation.navigate('PostDetail', {
        postId: item.targetId,
        userId: user.uid
      });
    }
  }, [user?.uid, navigation]);

  const renderItem = useCallback(({ item }: { item: AggregatedNotification }) => (
    <NotificationItem
      item={item}
      onPress={handleNotificationPress}
      onUserPress={handleUserPress}
    />
  ), [handleNotificationPress, handleUserPress]);

  const keyExtractor = useCallback((item: AggregatedNotification) => item.id, []);

  const ListEmptyComponent = useMemo(() => (
    <EmptyState
      icon="notifications-outline"
      title="No notifications yet"
      subtitle="We'll notify you when something happens"
    />
  ), []);

  if (loading && notifications.length === 0) {
    return (
      <ScreenLayout scrollable={false} includeTopInset={false}>
        <GlassHeader title="Notifications" showBack={true} onBack={() => navigation.goBack()} />
        <LoadingState fullScreen />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable={false} includeTopInset={false}>
      <GlassHeader title="Notifications" showBack={true} onBack={() => navigation.goBack()} />
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
    paddingTop: 110,
  },
});
