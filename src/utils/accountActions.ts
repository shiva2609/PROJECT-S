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
import { signOut } from '../api/authService';
import { NavigationProp } from '@react-navigation/native';

/**
 * Handle user logout
 * 
 * Signs out from Firebase, clears AsyncStorage, resets Redux state,
 * and navigates to onboarding screen
 * 
 * @param navigation - Navigation object from React Navigation
 * @param dispatch - Redux dispatch function
 */
export const handleLogout = async (
  navigation: NavigationProp<any>,
  dispatch: AppDispatch
) => {
  try {
    // Sign out from Firebase Auth
    try {
      await signOut();
      console.log('✅ Signed out from Firebase Auth');
    } catch (authError: any) {
      console.error('❌ Auth Error - Failed to sign out:', {
        code: authError?.code,
        message: authError?.message,
      });
      throw authError;
    }
    
    // Clear persisted user data
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      console.log('✅ Cleared AsyncStorage');
    } catch (storageError: any) {
      console.error('❌ Storage Error - Failed to clear AsyncStorage:', {
        message: storageError?.message,
      });
      // Non-critical, continue with logout
    }
    
    // Reset Redux state
    dispatch(logout());
    console.log('✅ Cleared Redux state');
    
    Alert.alert('Logged out', 'You have been logged out.', [
      {
        text: 'OK',
        onPress: () => {
          // Navigate to onboarding
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding1' }],
          });
        },
      },
    ]);
  } catch (error: any) {
    console.error('❌ Logout error:', {
      code: error?.code,
      message: error?.message,
      error: error,
    });
    Alert.alert('Error', 'Failed to logout. Please try again.');
  }
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

