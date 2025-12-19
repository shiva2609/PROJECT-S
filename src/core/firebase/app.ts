/**
 * Firebase App Initialization (Native)
 * 
 * Uses @react-native-firebase/app which reads from google-services.json / GoogleService-Info.plist
 */

import firebase from '@react-native-firebase/app';

// The default app is automatically initialized by the native module
const firebaseApp = firebase.app();
console.log('🔥 Firebase App (Native) initialized');

export { firebaseApp };
