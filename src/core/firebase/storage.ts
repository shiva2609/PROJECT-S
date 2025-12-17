/**
 * Firebase Storage Instance (Native)
 * 
 * Uses @react-native-firebase/storage
 */

import storage from '@react-native-firebase/storage';

const storageInstance = storage();
console.log('✅ Firebase Storage (Native) initialized');

export { storageInstance as storage };
