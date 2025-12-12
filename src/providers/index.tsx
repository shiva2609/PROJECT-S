/**
 * Combined Providers
 * 
 * Exports all app providers in a single combined component
 * This ensures proper provider nesting order
 */

import React, { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from '../store';
import { AuthProvider } from './AuthProvider';
import { UserProvider } from './UserProvider';
import { UserRelationProvider } from './UserRelationProvider';
import { MessageProvider } from './MessageProvider';
import { ThemeProvider } from './ThemeProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { CreateFlowProvider } from '../store/stores/useCreateFlowStore';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Combined provider component that wraps the app with all necessary providers
 * Order matters: outer providers are available to inner providers
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Provider store={store}>
            <AuthProvider>
              <UserProvider>
                <UserRelationProvider>
                  <MessageProvider>
                    <ThemeProvider>
                      <CreateFlowProvider>
                        {children}
                      </CreateFlowProvider>
                    </ThemeProvider>
                  </MessageProvider>
                </UserRelationProvider>
              </UserProvider>
            </AuthProvider>
          </Provider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Re-export individual providers and hooks for convenience
export { AuthProvider, useAuth } from './AuthProvider';
export { UserProvider, useUserContext } from './UserProvider';
export { UserRelationProvider, useUserRelations } from './UserRelationProvider';
export { MessageProvider, useMessageContext } from './MessageProvider';
export { ThemeProvider, useTheme } from './ThemeProvider';
export { ErrorBoundary } from './ErrorBoundary';

