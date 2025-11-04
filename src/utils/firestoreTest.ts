/**
 * Firestore Connection Test Utility
 * 
 * Tests Firestore connection and authentication before operations
 */

import { db, auth } from '../api/authService';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

/**
 * Test Firestore connection and write permissions
 * Creates a test document, reads it, then deletes it
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ Firestore test failed: No authenticated user');
      return false;
    }

    console.log('🧪 Testing Firestore connection...');
    console.log('🔑 User ID:', user.uid);
    console.log('📦 Firestore instance:', db ? 'Available' : 'NULL');

    // Test write permission
    const testDocRef = doc(db, 'healthcheck', `test_${user.uid}_${Date.now()}`);
    const testData = {
      test: true,
      timestamp: Date.now(),
      uid: user.uid,
    };

    console.log('📝 Attempting test write...');
    await setDoc(testDocRef, testData);
    console.log('✅ Test write successful');

    // Test read permission
    console.log('📖 Attempting test read...');
    const snapshot = await getDoc(testDocRef);
    if (!snapshot.exists()) {
      console.error('❌ Test document not found after write');
      return false;
    }
    console.log('✅ Test read successful');

    // Cleanup
    console.log('🧹 Cleaning up test document...');
    await deleteDoc(testDocRef);
    console.log('✅ Test document deleted');

    console.log('✅ Firestore connection test passed');
    console.log('✅ Firestore connection successful');
    return true;
  } catch (error: any) {
    console.error('❌ Firestore connection test failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return false;
  }
}

