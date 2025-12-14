/**
 * Firebase Storage Instance
 * 
 * SINGLE SOURCE OF TRUTH for Firebase Storage.
 * Exports a single Storage instance.
 * 
 * DO NOT call getStorage() anywhere else.
 */

import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseApp } from './app';

const storage: FirebaseStorage = getStorage(firebaseApp);
console.log('✅ Firebase Storage initialized');

export { storage };
