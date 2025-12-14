/**
 * Firebase App Initialization
 * 
 * SINGLE SOURCE OF TRUTH for Firebase app initialization.
 * This file ensures Firebase is initialized exactly once.
 * 
 * DO NOT call initializeApp() anywhere else in the codebase.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;

// Initialize Firebase App (reuse existing if available)
if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
    console.log('🔥 Firebase App initialized:', {
        projectId: firebaseApp.options.projectId,
        appId: firebaseApp.options.appId,
        authDomain: firebaseApp.options.authDomain,
    });
} else {
    firebaseApp = getApp();
    console.log('🔥 Firebase App already initialized, reusing existing instance');
}

export { firebaseApp };
