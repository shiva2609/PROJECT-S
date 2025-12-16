import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { userStore } from '../global/stores/userStore';
import { View, ActivityIndicator } from 'react-native';

export type BootState =
    | 'AUTH_INITIALIZING'
    | 'AUTH_READY'
    | 'PROFILE_LOADING'
    | 'PROFILE_READY'
    | 'APP_READY'
    | 'ERROR';

interface BootGateContextType {
    bootState: BootState;
    isAppReady: boolean;
}

const BootGateContext = createContext<BootGateContextType>({
    bootState: 'AUTH_INITIALIZING',
    isAppReady: false,
});

export const useBootGate = () => useContext(BootGateContext);

interface BootGateProps {
    children: ReactNode;
}

export function BootGate({ children }: BootGateProps) {
    const { user, initialized: authInitialized } = useAuth();
    const [bootState, setBootState] = useState<BootState>('AUTH_INITIALIZING');

    useEffect(() => {
        let mounted = true;

        const runBootSequence = async () => {
            if (!authInitialized) {
                setBootState('AUTH_INITIALIZING');
                return;
            }

            // Auth is ready
            if (!user) {
                // No user logged in -> App Ready (Login User)
                setBootState('APP_READY');
                return;
            }

            setBootState('AUTH_READY');

            // Add a small delay to ensure state updates propagate
            // and to prevent race conditions
            await new Promise(resolve => setTimeout(resolve, 0));

            if (!mounted) return;

            setBootState('PROFILE_LOADING');

            try {
                // Fetch user profile
                // We use userStore to fetch, which updates global store
                // AuthProvider and UserProvider are subscribed to this store
                await userStore.fetchCurrentUser(user.uid);

                if (!mounted) return;

                // For V1, we treat all users as APP_READY once profile is loaded (or attempted)
                setBootState('PROFILE_READY');
                setBootState('APP_READY');

            } catch (error) {
                console.error('BootGate Error:', error);
                if (mounted) setBootState('ERROR');
            }
        };

        runBootSequence();

        return () => {
            mounted = false;
        };
    }, [user, authInitialized]);

    const value = {
        bootState,
        isAppReady: bootState === 'APP_READY',
    };

    // While initializing, we can show a splash screen or loading indicator
    // or return null if the native splash screen is still active.
    // For now, if not ready, we block children.

    if (bootState === 'ERROR') {
        // Allow app to load so ErrorBoundary can catch or user can retry
        // Or show a specific Error Screen here
        return <>{children}</>;
    }

    // We block rendering of navigation until we are ready
    if (bootState !== 'APP_READY') {
        // You can return a Loading Component here
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    return (
        <BootGateContext.Provider value={value}>
            {children}
        </BootGateContext.Provider>
    );
}
