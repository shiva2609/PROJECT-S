import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import * as UsersAPI from '../services/users/usersService';

interface UsePushTokenManagerReturn {
  registerPushToken: () => Promise<void>;
  removePushToken: () => Promise<void>;
  syncTokenWithServer: () => Promise<void>;
}

/**
 * Global hook for managing device push notification tokens
 * Registers, syncs, and removes push tokens with the server
 */
export function usePushTokenManager(): UsePushTokenManagerReturn {
  const { user } = useAuth();

  const getPushToken = useCallback(async (): Promise<string | null> => {
    try {
      // Placeholder: In production, use expo-notifications or react-native-push-notification
      // For now, return a placeholder token
      // Example with expo-notifications:
      // const token = await Notifications.getExpoPushTokenAsync();
      // return token.data;
      
      // Placeholder implementation
      return 'placeholder_token_' + Date.now();
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }, []);

  const registerPushToken = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      return;
    }

    try {
      const token = await getPushToken();
      if (!token) {
        throw new Error('Failed to get push token');
      }

      await UsersAPI.updatePushToken(user.uid, token);
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }, [user?.uid, getPushToken]);

  const removePushToken = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      return;
    }

    try {
      await UsersAPI.removePushToken(user.uid);
    } catch (error) {
      console.error('Error removing push token:', error);
      throw error;
    }
  }, [user?.uid]);

  const syncTokenWithServer = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      return;
    }

    try {
      const token = await getPushToken();
      if (token) {
        await UsersAPI.updatePushToken(user.uid, token);
      }
    } catch (error) {
      console.error('Error syncing push token:', error);
      throw error;
    }
  }, [user?.uid, getPushToken]);

  // Auto-register token when user logs in
  useEffect(() => {
    if (user?.uid) {
      registerPushToken().catch(error => {
        console.error('Failed to register push token on login:', error);
      });
    }
  }, [user?.uid, registerPushToken]);

  return {
    registerPushToken,
    removePushToken,
    syncTokenWithServer,
  };
}

