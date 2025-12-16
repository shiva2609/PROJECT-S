/**
 * Firebase Firestore Instance
 * 
 * SINGLE SOURCE OF TRUTH for Firestore.
 * Exports a single Firestore instance configured for React Native.
 * 
 * DO NOT call initializeFirestore() or getFirestore() anywhere else.
 */

import {
    initializeFirestore,
    getFirestore,
    enableNetwork,
    Firestore,
    persistentLocalCache,
    persistentSingleTabManager
} from 'firebase/firestore';
import { firebaseApp } from './app';

let db: Firestore;

// Initialize Firestore with long polling AND persistent local cache (IndexedDB)
try {
    db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) })
    });
    console.log('✅ Firestore initialized with persistence & long polling');
} catch (e: any) {
    // If already initialized, get existing instance
    console.log('⚠️ Firestore already initialized, getting existing instance:', e?.message);
    db = getFirestore(firebaseApp);
}

// Ensure network is enabled with retry logic
(async () => {
    let retries = 3;
    while (retries > 0) {
        try {
            await enableNetwork(db);
            console.log('✅ Firestore network enabled');
            console.log('✅ Firestore connection successful');
            break;
        } catch (e: any) {
            retries--;
            if (retries === 0) {
                console.warn('⚠️ Network enable failed after retries:', e?.message || e);
                console.warn('⚠️ App will continue in offline mode');
            } else {
                console.warn(`⚠️ Network enable failed, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
})();

export { db };
