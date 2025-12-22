import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { NativeModules, View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { userStore } from '../global/stores/userStore';

// 🔐 SAFE Native Module access
const SplashScreen = NativeModules.SplashScreen;

interface AppBootstrapProps {
    children: ReactNode;
}

/**
 * AppBootstrap
 * 
 * The single source of truth for app initialization.
 * Blocks rendering of the app tree until all bootstrap conditions are met.
 * Hides the native splash screen ONLY once everything is ready.
 */
export function AppBootstrap({ children }: AppBootstrapProps) {
    const { user, authReady } = useAuth();
    const [appReady, setAppReady] = useState(false);
    const splashHiddenRef = useRef(false);

    // 1. Core Bootstrap Logic
    useEffect(() => {
        async function bootstrap() {
            // Step A: Wait for Firebase Auth to initialize
            if (!authReady) return;

            try {
                console.log('🚀 [AppBootstrap] Auth ready. Hydrating store...');

                // Step B: Hydrate User Store (and other async stores)
                if (user) {
                    // Await critical startup data
                    await userStore.fetchCurrentUser(user.uid).catch(err => {
                        console.warn('⚠️ [AppBootstrap] User fetch non-fatal error:', err);
                    });
                }

                // Step C: Mark app as ready
                console.log('✅ [AppBootstrap] Bootstrap sequences complete.');
                setAppReady(true);
            } catch (error) {
                console.error('🛑 [AppBootstrap] CRITICAL BOOTSTRAP FAILURE:', error);
                // Still set ready to true to prevent infinite black screen
                setAppReady(true);
            }
        }

        bootstrap();
    }, [user, authReady]);

    // 2. Splash Screen Lifecycle Management
    useEffect(() => {
        if (appReady && !splashHiddenRef.current) {
            if (SplashScreen && typeof SplashScreen.hide === 'function') {
                SplashScreen.hide();
                console.log('✨ [AppBootstrap] Native splash hidden.');
            } else {
                console.log('ℹ️ [AppBootstrap] Native SplashScreen module not found or hide() not available.');
            }
            splashHiddenRef.current = true;
        }
    }, [appReady]);

    // 🔐 BLOCK ALL UI until bootstrap is complete
    // The native splash (managed by OS) hides as soon as the app draws.
    // By rendering an identical placeholder here, we "bridge" the persistent splash.
    if (!appReady) {
        return <SplashPlaceholder />;
    }

    return <>{children}</>;
}

/**
 * SplashPlaceholder
 * 
 * Replicates the SplashScreen UI exactly to provide a seamless transition
 * between the native startup and the React Native application hydration.
 */
function SplashPlaceholder() {
    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.logo}>S</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF', // colors.surface
    },
    logo: {
        fontSize: 42,
        fontWeight: '800',
        color: '#FF5C02', // colors.primary
    },
});
