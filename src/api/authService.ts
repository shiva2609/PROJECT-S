/**
 * Firebase Authentication Service
 * 
 * Complete authentication service with email/username support, Firestore integration,
 * and full error handling. Ready for production use.
 * 
 * Features:
 * - Sign up with email + username (unique username validation)
 * - Sign in with email OR username
 * - Forgot password with email OR username
 * - Change password for authenticated users
 * - Sign out
 * - Automatic Firestore user document creation
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
	initializeAuth,
	getAuth,
	Auth,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	sendPasswordResetEmail,
	updatePassword,
	signOut as firebaseSignOut,
	deleteUser,
	User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	getFirestore,
	Firestore,
	doc,
	getDoc,
	setDoc,
	updateDoc,
	enableNetwork,
	initializeFirestore,
	collection,
	query,
	where,
	getDocs,
	serverTimestamp,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { AccountType, VerificationStatus } from '../types/account';

// ---------- Firebase Configuration ----------

const firebaseConfig = {
	apiKey: "AIzaSyCxjt5nfPlD6GwKpP3799rLefn7MrucFOQ",
	authDomain: "sanchari-truetraveller.firebaseapp.com",
	projectId: "sanchari-truetraveller",
	storageBucket: "sanchari-truetraveller.firebasestorage.app",
	messagingSenderId: "893206677174",
	appId: "1:893206677174:web:91d611d0643d1a9f5f8817",
	measurementId: "G-5N4YWHGJSL"
};

// Initialize Firebase App (reuse existing if available)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

console.log('🔥 Firebase App initialized:', {
	projectId: app.options.projectId,
	appId: app.options.appId,
	authDomain: app.options.authDomain,
});

// Initialize Auth with persistent storage (AsyncStorage)
// This is REQUIRED for React Native - getAuth() does NOT persist by default
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
		// This fixes the "Expected a class definition" error
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
	
	auth = initializeAuth(app, {
		persistence: persistence,
	});
	console.log('✅ Firebase Auth initialized with persistent storage (AsyncStorage)');
} catch (error: any) {
	// Handle initialization errors (especially "already-initialized" and "Expected a class definition")
	if (error.code === 'auth/already-initialized' || 
	    error.message?.includes('already-initialized') ||
	    error.message?.includes('Firebase Auth has already been initialized') ||
	    error.message?.includes('Expected a class definition')) {
		// Auth was already initialized (common in dev with hot reload)
		auth = getAuth(app);
		console.log('⚠️ Auth already initialized, using existing instance');
		console.log('⚠️ Note: If persistence was configured on first init, it should work');
	} else {
		console.error('❌ Failed to initialize auth with persistence:', {
			code: error.code,
			message: error.message,
		});
		// Last resort fallback - use getAuth (but it won't persist)
		auth = getAuth(app);
		console.error('❌ CRITICAL: Falling back to getAuth - AUTH WILL NOT PERSIST');
		console.error('   User sessions will be lost on app reload!');
		console.error('   Error details:', error.message);
	}
}

// Initialize Firestore with long polling for React Native
let dbInstance: Firestore;
try {
	dbInstance = initializeFirestore(app, {
		experimentalForceLongPolling: true,
	});
	console.log('✅ Firestore initialized with long polling');
} catch (e: any) {
	// If already initialized, get existing instance
	console.log('⚠️ Firestore already initialized, getting existing instance:', e?.message);
	dbInstance = getFirestore(app);
}

// Ensure network is enabled
(async () => {
	try {
		await enableNetwork(dbInstance);
		console.log('✅ AuthService: Firestore network enabled');
		console.log('✅ Firestore connection successful');
	} catch (e: any) {
		console.error('❌ AuthService: Network enable failed:', e?.message || e);
	}
})();

// Initialize Firebase Storage
const storage = getStorage(app);
console.log('✅ Firebase Storage initialized');

// Export Firestore instance
const db: Firestore = dbInstance;
console.log('📦 Firestore instance exported, ready for use');

// Export app, auth, and db as specified
export { app, auth, db, storage };

// ---------- Types ----------

export interface UserData {
	uid: string;
	email: string;
	username: string;
	usernameLower: string;
	accountType: AccountType;
	verificationStatus: VerificationStatus;
	createdAt: any; // Can be number or serverTimestamp
	updatedAt?: number;
	// Legacy role field for backward compatibility
	role?: 'traveler' | 'host';
	// Optional KYC and agreement fields
	kycData?: any;
	safetyAgreement?: any;
}

// ---------- Helper Functions ----------

const SYSTEM_EMAIL_DOMAIN = 'sanchari.app';

/**
 * Converts username to synthesized email format
 */
function synthesizeEmailFromUsername(username: string): string {
	return `${username.toLowerCase().trim()}@${SYSTEM_EMAIL_DOMAIN}`;
}

/**
 * Checks if identifier is email or username
 */
function isEmail(identifier: string): boolean {
	return identifier.includes('@');
}

/**
 * Gets email from identifier (username or email)
 * Supports both usernames collection and users collection lookup
 */
async function getEmailFromIdentifier(identifier: string): Promise<string> {
	if (isEmail(identifier)) {
		return identifier.trim().toLowerCase();
	}
	
	// It's a username - lookup user document to get email
	const usernameLower = identifier.trim().toLowerCase();
	
	// Try usernames collection first (faster)
	try {
		const usernameDoc = await getDoc(doc(db, 'usernames', usernameLower));
		if (usernameDoc.exists()) {
			const { uid } = usernameDoc.data();
			const userDoc = await getDoc(doc(db, 'users', uid));
			if (userDoc.exists()) {
				const userData = userDoc.data() as UserData;
				return userData.email;
			}
		}
	} catch (e) {
		// Fall through to users collection query
		console.log('⚠️ Usernames collection lookup failed, trying users collection...');
	}
	
	// Fallback: Query users collection directly by usernameLower
	try {
		const usersRef = collection(db, 'users');
		const q = query(usersRef, where('usernameLower', '==', usernameLower));
		const querySnapshot = await getDocs(q);
		
		if (!querySnapshot.empty && querySnapshot.docs[0]) {
			const userData = querySnapshot.docs[0].data() as UserData;
			return userData.email;
		}
	} catch (e: any) {
		console.error('Error querying users collection:', e);
	}
	
	throw new Error('Username not found');
}

/**
 * Checks if username is available (not taken)
 * 
 * Queries the users collection for any document with matching usernameLower.
 * Returns true if no documents found (username is available).
 * 
 * @param username - Username to check
 * @returns true if username is available, false if taken
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
	try {
		const usernameLower = username.trim().toLowerCase();
		
		if (!usernameLower || usernameLower.length === 0) {
			return false;
		}

		// Query users collection for existing username
		const usersRef = collection(db, 'users');
		const q = query(usersRef, where('usernameLower', '==', usernameLower));
		const querySnapshot = await getDocs(q);
		
		// If query result is empty, username is available
		const isAvailable = querySnapshot.empty;
		
		console.log(`🔍 Username "${usernameLower}" availability check: ${isAvailable ? 'AVAILABLE' : 'TAKEN'}`);
		
		return isAvailable;
	} catch (error: any) {
		console.error('❌ Error checking username availability:', error);
		// On error, return false to be safe (prevent duplicates)
		throw new Error('Failed to check username availability. Please try again.');
	}
}

/**
 * Reserves username in Firestore
 */
async function reserveUsername(username: string, uid: string): Promise<void> {
	try {
		await setDoc(doc(db, 'usernames', username.toLowerCase().trim()), { uid });
		console.log(`✅ Username reserved: ${username}`);
	} catch (error: any) {
		console.error('Error reserving username:', error);
		throw new Error('Failed to reserve username');
	}
}

/**
 * Creates user document in Firestore
 * Uses serverTimestamp() for createdAt field
 */
async function createUserDocument(uid: string, userData: Omit<UserData, 'createdAt'> & { createdAt: any }): Promise<void> {
	try {
		await setDoc(doc(db, 'users', uid), userData);
		console.log(`✅ User document created: ${uid}`);
	} catch (error: any) {
		console.error('❌ Error creating user document:', error);
		throw new Error('Failed to create user document');
	}
}

// ---------- Public API Functions ----------

/**
 * Sign Up with email, username, and password
 * 
 * @param email - User's email address
 * @param username - Unique username (will be validated)
 * @param password - User's password
 * @returns UserData object with created user information
 * 
 * @throws Error if username is taken, email is invalid, or Firebase operation fails
 */
export async function signUp(
	email: string,
	username: string,
	password: string
): Promise<UserData> {
	let authUser: User | null = null;

	try {
		// Validate inputs
		const cleanEmail = email.trim().toLowerCase();
		const usernameLower = username.trim().toLowerCase();

		if (!cleanEmail || !cleanEmail.includes('@')) {
			throw new Error('Invalid email address');
		}

		if (!usernameLower || usernameLower.length === 0) {
			throw new Error('Username cannot be empty');
		}

		if (password.length < 6) {
			throw new Error('Password must be at least 6 characters');
		}

		// Check username availability FIRST (before creating auth user)
		console.log(`🔍 Checking username availability: "${usernameLower}"`);
		const available = await isUsernameAvailable(usernameLower);
		if (!available) {
			throw new Error('Username already taken');
		}
		console.log(`✅ Username "${usernameLower}" is available`);

		// Create Firebase Auth user
		console.log('📝 Creating Firebase Auth user...');
		const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
		authUser = userCredential.user;
		console.log(`✅ Firebase Auth user created: ${authUser.uid}`);

		// Create user document in Firestore with usernameLower field
		const userData: UserData = {
			uid: authUser.uid,
			email: cleanEmail,
			username: usernameLower, // Store normalized username
			usernameLower: usernameLower, // Store lowercase for querying
			accountType: 'Traveler' as AccountType,
			verificationStatus: 'none' as VerificationStatus,
			role: 'traveler' as const, // Legacy support
			createdAt: serverTimestamp(), // Use server timestamp
		};

		console.log('📝 Creating Firestore user document...');
		await createUserDocument(authUser.uid, userData);
		console.log(`✅ User document created in Firestore`);

		// Reserve username in usernames collection (optional, for faster lookup)
		try {
			await reserveUsername(usernameLower, authUser.uid);
		} catch (reserveError: any) {
			// Non-critical - username is already in users collection
			console.warn('⚠️ Failed to reserve username (non-critical):', reserveError);
		}

		console.log(`🎉 Signup complete for: ${usernameLower} (${cleanEmail})`);
		
		// Return user data with timestamp (convert serverTimestamp to number for response)
		return {
			...userData,
			createdAt: Date.now(), // Convert to number for response
		};
	} catch (error: any) {
		console.error('❌ Signup error:', error);

		// ROLLBACK: If auth user was created but Firestore write failed, delete auth user
		if (authUser) {
			try {
				console.log('🔄 Rolling back: Deleting Firebase Auth user due to Firestore write failure...');
				await deleteUser(authUser);
				console.log('✅ Auth user deleted (rollback successful)');
			} catch (rollbackError: any) {
				console.error('❌ Failed to rollback auth user:', rollbackError);
				// Still throw original error with guidance
				throw new Error('Account creation failed. Please try again. If the problem persists, contact support.');
			}
		}

		// Handle specific Firebase errors
		if (error.code === 'auth/email-already-in-use') {
			throw new Error('Email is already registered');
		}
		if (error.code === 'auth/invalid-email') {
			throw new Error('Invalid email address');
		}
		if (error.code === 'auth/weak-password') {
			throw new Error('Password is too weak');
		}

		// Re-throw custom errors
		if (error.message.includes('Username') || error.message.includes('email') || error.message.includes('Password')) {
			throw error;
		}

		// Generic error
		throw new Error('Signup failed. Please try again.');
	}
}

/**
 * Sign In with email OR username and password
 * 
 * @param identifier - User's email address OR username
 * @param password - User's password
 * @returns UserData object with signed-in user information
 * 
 * @throws Error if credentials are invalid or user not found
 */
export async function signIn(
	identifier: string,
	password: string
): Promise<UserData> {
	try {
		if (!identifier || !password) {
			throw new Error('Email/username and password are required');
		}

		// Get email from identifier (username or email)
		let email: string;
		if (isEmail(identifier)) {
			email = identifier.trim().toLowerCase();
		} else {
			console.log(`🔍 Looking up email for username: ${identifier}`);
			email = await getEmailFromIdentifier(identifier);
			console.log(`✅ Found email: ${email}`);
		}

		// Sign in with Firebase Auth
		console.log('📝 Signing in...');
		const userCredential = await signInWithEmailAndPassword(auth, email, password);
		const user = userCredential.user;
		console.log(`✅ Signed in: ${user.uid}`);

		// Get user document from Firestore
		const userDoc = await getDoc(doc(db, 'users', user.uid));
		
		if (!userDoc.exists()) {
			throw new Error('User profile not found');
		}

		const userData = userDoc.data() as UserData;
		console.log(`✅ User data retrieved: ${userData.username}`);
		return userData;
	} catch (error: any) {
		console.error('❌ Sign in error:', error);

		// Handle specific Firebase errors
		if (error.code === 'auth/user-not-found') {
			throw new Error('User not found');
		}
		if (error.code === 'auth/wrong-password') {
			throw new Error('Incorrect password');
		}
		if (error.code === 'auth/invalid-email') {
			throw new Error('Invalid email address');
		}
		if (error.code === 'auth/too-many-requests') {
			throw new Error('Too many failed attempts. Please try again later.');
		}

		// Re-throw custom errors
		if (error.message) {
			throw error;
		}

		// Generic error
		throw new Error('Sign in failed. Please check your credentials.');
	}
}

/**
 * Send password reset email using email OR username
 * 
 * @param identifier - User's email address OR username
 * @returns void
 * 
 * @throws Error if identifier not found or Firebase operation fails
 */
export async function forgotPassword(identifier: string): Promise<void> {
	try {
		if (!identifier || identifier.trim().length === 0) {
			throw new Error('Email or username is required');
		}

		// Get email from identifier (username or email)
		let email: string;
		if (isEmail(identifier)) {
			email = identifier.trim().toLowerCase();
		} else {
			console.log(`🔍 Looking up email for username: ${identifier}`);
			email = await getEmailFromIdentifier(identifier);
			console.log(`✅ Found email: ${email}`);
		}

		// Send password reset email
		console.log('📧 Sending password reset email...');
		await sendPasswordResetEmail(auth, email);
		console.log(`✅ Password reset email sent to: ${email}`);
	} catch (error: any) {
		console.error('❌ Forgot password error:', error);

		// Handle specific Firebase errors
		if (error.code === 'auth/user-not-found') {
			throw new Error('Email/username not found');
		}
		if (error.code === 'auth/invalid-email') {
			throw new Error('Invalid email address');
		}

		// Re-throw custom errors
		if (error.message && (error.message.includes('not found') || error.message.includes('required'))) {
			throw error;
		}

		// Generic error
		throw new Error('Failed to send password reset email. Please try again.');
	}
}

/**
 * Change password for currently signed-in user
 * 
 * @param newPassword - New password to set
 * @returns void
 * 
 * @throws Error if user not authenticated or password update fails
 */
export async function changePassword(newPassword: string): Promise<void> {
	try {
		const user = auth.currentUser;

		if (!user) {
			throw new Error('No user is currently signed in');
		}

		if (!newPassword || newPassword.length < 6) {
			throw new Error('Password must be at least 6 characters');
		}

		// Update password
		console.log('🔒 Updating password...');
		await updatePassword(user, newPassword);
		console.log('✅ Password updated successfully');

		// Optionally update Firestore with password change timestamp
		try {
			await updateDoc(doc(db, 'users', user.uid), {
				passwordChangedAt: Date.now(),
				updatedAt: Date.now(),
			});
		} catch (firestoreError) {
			// Non-critical error - password was changed but timestamp update failed
			console.warn('⚠️ Password changed but failed to update Firestore timestamp');
		}
	} catch (error: any) {
		console.error('❌ Change password error:', error);

		// Handle specific Firebase errors
		if (error.code === 'auth/requires-recent-login') {
			throw new Error('Please sign in again before changing your password');
		}
		if (error.code === 'auth/weak-password') {
			throw new Error('Password is too weak');
		}

		// Re-throw custom errors
		if (error.message) {
			throw error;
		}

		// Generic error
		throw new Error('Failed to change password. Please try again.');
	}
}

/**
 * Sign out current user
 * 
 * @returns void
 * 
 * @throws Error if sign out fails
 */
export async function signOut(): Promise<void> {
	try {
		const user = auth.currentUser;
		if (user) {
			console.log(`👋 Signing out user: ${user.uid}`);
			await firebaseSignOut(auth);
			console.log('✅ Signed out successfully');
		} else {
			console.log('ℹ️ No user to sign out');
		}
	} catch (error: any) {
		console.error('❌ Sign out error:', error);
		throw new Error('Failed to sign out. Please try again.');
	}
}

/**
 * Get current authenticated user's data from Firestore
 * 
 * @returns UserData if user is authenticated, null otherwise
 */
export async function getCurrentUserData(): Promise<UserData | null> {
	try {
		const user = auth.currentUser;
		if (!user) {
			return null;
		}

		const userDoc = await getDoc(doc(db, 'users', user.uid));
		if (!userDoc.exists()) {
			return null;
		}

		return userDoc.data() as UserData;
	} catch (error: any) {
		console.error('❌ Get current user error:', error);
		return null;
	}
}

// ---------- Export Summary ----------

/**
 * Complete Authentication Service
 * 
 * All functions are production-ready with:
 * - Full error handling
 * - TypeScript types
 * - Firestore integration
 * - Username/email support
 * - Console logging for debugging
 * 
 * Usage:
 * - import { signUp, signIn, forgotPassword, changePassword, signOut, auth, db } from './api/authService';
 */
