/**
 * Account Actions Utility
 * 
 * Shared functions for logout and upgrade account actions
 * Used by Side Menu Drawer and other components
 */

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDispatch } from '../store';
import { logout } from '../store';
import { AUTH_USER_KEY } from './constants';
import { signOut } from '../services/api/firebaseService';
import { db, auth } from '../core/firebase';
import { NavigationProp } from '@react-navigation/native';
import * as UsersAPI from '../services/users/usersService';

/**
 * Handle user logout
 * 
 * Signs out from Firebase, clears AsyncStorage, resets Redux state,
 * and navigates to onboarding screen
 * 
 * @param navigation - Navigation object from React Navigation
 * @param dispatch - Redux dispatch function
 */
export const handleLogout = (
  navigation: NavigationProp<any>,
  dispatch: AppDispatch
) => {
  Alert.alert(
    'Log Out',
    'Are you sure you want to log out?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Get current user before signing out to remove push tokens
            const currentUser = auth.currentUser;
            const userId = currentUser?.uid;

            // Remove push tokens before signing out (Best effort)
            if (userId) {
              try {
                // Get current user's push tokens and remove all
                const user = await UsersAPI.getUserById(userId);
                if (user?.pushTokens && user.pushTokens.length > 0) {
                  // Remove all push tokens for this user
                  for (const token of user.pushTokens) {
                    try {
                      await UsersAPI.removePushToken(userId, token);
                    } catch (tokenError) {
                      console.warn('Failed to remove push token:', tokenError);
                    }
                  }
                }
                console.log('✅ Removed push tokens');
              } catch (pushTokenError: any) {
                console.error('❌ Push Token Error:', pushTokenError?.message);
                // Non-critical, continue with logout
              }
            }

            // Sign out from Firebase Auth - This triggers AuthProvider state change
            await signOut();
            console.log('✅ Signed out from Firebase Auth');

            // NO manual navigation
            // NO manual state clearing
            // AuthProvider -> AppNavigator handles the transition

          } catch (error: any) {
            console.error('❌ Logout error:', error);
            // Only show alert if something truly failed in the synchronous part
            // But signOut is async, so we might not want to alert if UI already unmounted
          }
        },
      },
    ]
  );
};

/**
 * Handle upgrade account action
 * 
 * Navigates to the RoleUpgrade screen for account type upgrade
 * 
 * @param navigation - Navigation object from React Navigation
 */
export const handleUpgradeAccount = (navigation: NavigationProp<any>) => {
  navigation.navigate('RoleUpgrade');
};

