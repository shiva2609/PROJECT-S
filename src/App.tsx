import React from 'react';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';

// Suppress Firestore internal assertion errors (non-fatal SDK bugs)
// These errors are logged by Firebase's internal logging system and don't affect functionality
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  const errorString = args.join(' ');
  // Filter out Firestore internal assertion errors
  if (
    errorString.includes('FIRESTORE') &&
    (errorString.includes('INTERNAL ASSERTION FAILED') ||
     errorString.includes('INTERNAL ASSSERTION FAILED') || // Note: Firebase logs "ASSSERTION" (typo)
     errorString.includes('Unexpected state') ||
     errorString.includes('ID: b815') ||
     errorString.includes('ID: ca9'))
  ) {
    // Suppress these errors - they're non-fatal SDK bugs
    return;
  }
  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const warnString = args.join(' ');
  // Filter out Firestore internal assertion warnings
  if (
    warnString.includes('FIRESTORE') &&
    (warnString.includes('INTERNAL ASSERTION FAILED') ||
     warnString.includes('INTERNAL ASSSERTION FAILED') ||
     warnString.includes('Unexpected state') ||
     warnString.includes('ID: b815') ||
     warnString.includes('ID: ca9'))
  ) {
    // Suppress these warnings - they're non-fatal SDK bugs
    return;
  }
  // Log all other warnings normally
  originalConsoleWarn.apply(console, args);
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
