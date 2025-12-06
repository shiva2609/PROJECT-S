/**
 * Simple Toast Utility
 * Shows temporary messages to users
 */

import { Alert } from 'react-native';

/**
 * Show a toast message (using Alert for now)
 * In the future, can be replaced with a proper toast library
 */
export function showToast(message: string, duration: number = 2000) {
  // For now, use Alert.alert with a short timeout
  // In production, replace with a proper toast library like react-native-toast-message
  Alert.alert('', message, [{ text: 'OK' }]);
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string) {
  showToast(message);
}

/**
 * Show error toast
 */
export function showErrorToast(message: string) {
  showToast(message);
}

