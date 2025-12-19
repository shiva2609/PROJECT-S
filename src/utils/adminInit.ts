/**
 * Admin Account Initialization
 * 
 * Creates the SanchariAdmin superuser account in Firebase.
 * Run this once to set up the admin account.
 * 
 * Usage:
 * import { initializeAdminAccount } from './utils/adminInit';
 * await initializeAdminAccount();
 */

import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	doc,
	setDoc,
	getDoc,
	serverTimestamp
} from '../core/firebase/compat';
import { auth, db } from '../core/firebase';
import { AccountType } from '../types/account';

const ADMIN_CONFIG = {
	username: 'SanchariAdmin',
	email: 'kaustubha000@gmail.com',
	password: 'sanchari',
	role: 'superAdmin' as AccountType,
};

/**
 * Initializes the SanchariAdmin account if it doesn't exist
 * 
 * @returns true if admin was created or already exists, false on error
 */
export async function initializeAdminAccount(): Promise<boolean> {
	try {
		console.log('🔐 Initializing SanchariAdmin account...');

		// Check if admin user already exists in Firestore
		const adminUsersRef = doc(db, 'adminUsers', ADMIN_CONFIG.username.toLowerCase());
		const existingAdmin = await getDoc(adminUsersRef);

		if (existingAdmin.exists()) {
			console.log('✅ Admin account already exists in Firestore');
			const adminData = existingAdmin.data();

			// Verify the auth user exists
			try {
				// Try to sign in to verify auth user exists
				await signInWithEmailAndPassword(auth, ADMIN_CONFIG.email, ADMIN_CONFIG.password);
				console.log('✅ Admin auth account verified');
				return true;
			} catch (authError: any) {
				if (authError.code === 'auth/user-not-found') {
					console.log('⚠️ Admin auth user not found, creating...');
					// Continue to create auth user
				} else {
					throw authError;
				}
			}
		}

		// Create Firebase Auth user
		console.log('📝 Creating Firebase Auth user for admin...');
		let authUser;
		try {
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				ADMIN_CONFIG.email,
				ADMIN_CONFIG.password
			);
			authUser = userCredential.user;
			console.log(`✅ Admin auth user created: ${authUser?.uid}`);
		} catch (error: any) {
			if (error.code === 'auth/email-already-in-use') {
				console.log('✅ Admin auth user already exists');
				// Try to find existing user by email (would need to query users collection)
				// For now, we'll just create the Firestore document
				console.log('⚠️ Auth user exists but admin document may be missing. Creating Firestore doc...');
				// Fallback: If we can't get the UID from creation, we might be stuck unless we sign in.
				// But we tried signing in above if existingAdmin existed.
				// If existingAdmin DID NOT exist, but Auth user DOES exist, we are here.
				try {
					const cred = await signInWithEmailAndPassword(auth, ADMIN_CONFIG.email, ADMIN_CONFIG.password);
					authUser = cred.user;
				} catch (e) {
					console.error("Could not recover auth user ID");
					throw error;
				}

			} else {
				throw error;
			}
		}

		// Create/update admin user document in users collection
		if (authUser) {
			const adminUserDoc: any = {
				uid: authUser.uid,
				email: ADMIN_CONFIG.email,
				username: ADMIN_CONFIG.username.toLowerCase(),
				usernameLower: ADMIN_CONFIG.username.toLowerCase(),
				accountType: ADMIN_CONFIG.role,
				verificationStatus: 'verified' as const,
				permissions: 'all',
				createdAt: serverTimestamp(),
				updatedAt: Date.now(),
			};

			console.log('📝 Creating admin user document in users collection...');
			await setDoc(doc(db, 'users', authUser.uid), adminUserDoc);
			console.log(`✅ Admin user document created: ${authUser.uid}`);

			// Also store in adminUsers collection for easy lookup
			await setDoc(adminUsersRef, {
				uid: authUser.uid,
				username: ADMIN_CONFIG.username,
				email: ADMIN_CONFIG.email,
				role: ADMIN_CONFIG.role,
				createdAt: serverTimestamp(),
			});
			console.log('✅ Admin reference stored in adminUsers collection');

			console.log('🎉 SanchariAdmin account initialized successfully!');
			return true;
		}

		return false;
	} catch (error: any) {
		console.error('❌ Failed to initialize admin account:', error);
		console.error('Error details:', error.message, error.code);
		return false;
	}
}

/**
 * Check if current user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) return false;

		const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
		if (!userDoc.exists()) return false;

		const userData = userDoc.data();
		return userData?.accountType === 'superAdmin' || userData?.role === 'superAdmin';
	} catch (error) {
		console.error('Error checking admin status:', error);
		return false;
	}
}

/**
 * Get admin UID (for verification purposes)
 */
export async function getAdminUID(): Promise<string | null> {
	try {
		const adminUsersRef = doc(db, 'adminUsers', ADMIN_CONFIG.username.toLowerCase());
		const adminDoc = await getDoc(adminUsersRef);
		if (adminDoc.exists()) {
			return adminDoc.data().uid;
		}
		return null;
	} catch (error) {
		console.error('Error getting admin UID:', error);
		return null;
	}
}

