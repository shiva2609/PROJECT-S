/**
 * Firebase Core Exports
 * 
 * Central barrel export for all Firebase instances.
 * Import Firebase services from here ONLY.
 * 
 * Usage:
 *   import { auth, db, storage } from '@/core/firebase';
 */

export { firebaseApp } from './app';
export { auth } from './auth';
export { db } from './firestore';
export { storage } from './storage';
export { firebaseConfig } from './config';
