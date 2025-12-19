/**
 * Firebase Firestore Instance (Native)
 * 
 * Uses @react-native-firebase/firestore
 */

import firestore from '@react-native-firebase/firestore';

const db = firestore();
console.log('✅ Firestore (Native) initialized');

export { db };
