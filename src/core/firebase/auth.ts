/**
 * Firebase Auth Instance
 * 
 * SINGLE SOURCE OF TRUTH for Firebase Auth.
 * Exports a single, persistent auth instance with AsyncStorage.
 * 
 * DO NOT call initializeAuth() or getAuth() anywhere else.
 */

import {
    initializeAuth,
    getAuth,
    Auth,
    getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseApp } from './app';

let auth: Auth;

try {
    console.log('🔧 Initializing Firebase Auth with AsyncStorage persistence...');

    // Try to use getReactNativePersistence if available (Firebase v12+)
    let persistence: any;
    const authModule = require('firebase/auth');

    if (authModule.getReactNativePersistence) {
        persistence = authModule.getReactNativePersistence(AsyncStorage);
        console.log('✅ Using getReactNativePersistence');
    } else {
        // Create a class-based persistence adapter (required by Firebase)
        console.log('⚠️ getReactNativePersistence not available, creating class-based adapter...');

        class ReactNativePersistence {
            type = 'LOCAL' as const;
            _storage: typeof AsyncStorage;

            constructor(storage: typeof AsyncStorage) {
                this._storage = storage;
            }

            async _isAvailable(): Promise<boolean> {
                try {
                    await this._storage.getItem('__firebase_auth_test__');
                    return true;
                } catch {
                    return false;
                }
            }

            async _set(key: string, value: string): Promise<void> {
                await this._storage.setItem(key, value);
            }

            async _get(key: string): Promise<string | null> {
                return await this._storage.getItem(key);
            }

            async _remove(key: string): Promise<void> {
                await this._storage.removeItem(key);
            }
        }

        persistence = new ReactNativePersistence(AsyncStorage);
    }

    auth = initializeAuth(firebaseApp, {
        persistence: persistence,
    });
    console.log('✅ Firebase Auth initialized with persistent storage (AsyncStorage)');
} catch (error: any) {
    // Handle initialization errors (especially "already-initialized")
    if (error.code === 'auth/already-initialized' ||
        error.message?.includes('already-initialized') ||
        error.message?.includes('Firebase Auth has already been initialized') ||
        error.message?.includes('Expected a class definition')) {
        // Auth was already initialized (common in dev with hot reload)
        auth = getAuth(firebaseApp);
        console.log('⚠️ Auth already initialized, using existing instance');
        console.log('⚠️ Note: If persistence was configured on first init, it should work');
    } else {
        console.error('❌ Failed to initialize auth with persistence:', {
            code: error.code,
            message: error.message,
        });
        // Last resort fallback - use getAuth (but it won't persist)
        auth = getAuth(firebaseApp);
        console.error('❌ CRITICAL: Falling back to getAuth - AUTH WILL NOT PERSIST');
        console.error('   User sessions will be lost on app reload!');
        console.error('   Error details:', error.message);
    }
}

export { auth };
