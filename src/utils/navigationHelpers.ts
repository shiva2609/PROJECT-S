/**
 * Navigation Helpers
 * Utilities for navigating across nested navigators
 */

import { CommonActions } from '@react-navigation/native';

/**
 * Navigate to a screen, trying parent navigators if needed
 */
export function navigateToScreen(navigation: any, screenName: string, params?: any) {
  if (!navigation) {
    console.error('Navigation object is null');
    return;
  }

  try {
    // Try direct navigation first (React Navigation v6 auto-resolves)
    if (typeof navigation.navigate === 'function') {
      navigation.navigate(screenName, params);
      return;
    }
  } catch (error: any) {
    console.log('Direct navigation failed:', error.message);
  }

  // Try using CommonActions for more reliable navigation
  try {
    if (navigation.dispatch) {
      navigation.dispatch(
        CommonActions.navigate({
          name: screenName,
          params,
        })
      );
      return;
    }
  } catch (error: any) {
    console.log('CommonActions navigation failed:', error.message);
  }

  // Try parent navigator
  try {
    const parent = navigation?.getParent?.();
    if (parent && typeof parent.navigate === 'function') {
      parent.navigate(screenName, params);
      return;
    }
  } catch (error: any) {
    console.log('Parent navigation failed:', error.message);
  }

  // Try traversing up the navigator tree
  try {
    let current = navigation;
    for (let i = 0; i < 5; i++) {
      const parent = current?.getParent?.();
      if (parent) {
        if (typeof parent.navigate === 'function') {
          try {
            parent.navigate(screenName, params);
            return;
          } catch (e: any) {
            console.log(`Parent level ${i} navigation failed:`, e.message);
          }
        }
        current = parent;
      } else {
        break;
      }
    }
  } catch (error: any) {
    console.error('Navigation traversal failed:', error.message);
  }

  console.error(`Failed to navigate to ${screenName}. Navigation object:`, navigation);
}

