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
    const { user, authReady } = useAuth();
    const [bootState, setBootState] = useState<BootState>('AUTH_INITIALIZING');

    useEffect(() => {
        let mounted = true;

        const runBootSequence = async () => {
            if (!authReady) {
                setBootState('AUTH_INITIALIZING');
                return;
            }

            // Auth is ready
            setBootState('AUTH_READY');

            if (!user) {
                // No user logged in -> App Ready (Login User)
                if (mounted) setBootState('APP_READY');
                return;
            }

            if (!mounted) return;

            // Optional: User Profile Fetching could happen here in a real app
            // But for this strict requirement, we don't block APP_READY on Firestore unless critical

            // For now, we trust Auth is enough to proceed to App
            // Profile loading happens in background via UserProvider or specific screens

            // Trigger background fetch if user exists, but don't await/block
            if (user) {
                userStore.fetchCurrentUser(user.uid).catch(console.error);
            }

            setBootState('PROFILE_READY');
            setBootState('APP_READY');
        };

        runBootSequence();

        return () => {
            mounted = false;
        };
    }, [user, authReady]);

    const value = {
        bootState,
        isAppReady: bootState === 'APP_READY',
    };

    if (bootState === 'ERROR') {
        return <>{children}</>;
    }

    // BLOCK RENDERING until APP_READY
    if (bootState !== 'APP_READY') {
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
