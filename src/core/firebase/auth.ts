/**
 * Firebase Auth Instance (Native)
 * 
 * Uses @react-native-firebase/auth
 * Native SDK handles persistence automatically (Keychain/Keystore).
 */

import auth from '@react-native-firebase/auth';

const authInstance = auth();
console.log('✅ Firebase Auth (Native) initialized');

export { authInstance as auth };
