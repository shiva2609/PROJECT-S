// Import centralized Firebase instances
import { auth, db as firebaseDb, storage as firebaseStorage, firebaseApp as app } from '../../core/firebase';

// Import Firebase auth functions
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	updateProfile,
	User as FirebaseUser,
	sendPasswordResetEmail,
	updatePassword,
	signOut as firebaseSignOut,
} from '../../core/firebase/compat';

// Import Firestore functions
import {
	doc,
	setDoc,
	getDoc,
	updateDoc,
	addDoc,
	collection,
	query,
	orderBy,
	onSnapshot,
	where,
	serverTimestamp,
	arrayUnion,
	arrayRemove,
	increment,
	runTransaction,
	deleteDoc,
	enableNetwork,
} from '../../core/firebase/compat';

// Import Storage functions
import {
	ref as storageRef,
	uploadBytes,
	uploadBytesResumable,
	getDownloadURL,
} from '../../core/firebase/compat';
import { Platform, Alert } from 'react-native';

// ---------- Types ----------

export type UserRole = 'traveler' | 'host';

export interface UserProfile {
	id: string; // uid
	username: string;
	displayName?: string;
	photoURL?: string;
	bio?: string;
	email?: string; // optional; filled during profile completion
	phone?: string; // optional; filled during profile completion
	role: UserRole;
	createdAt: number; // ms epoch
	updatedAt: number; // ms epoch
}

export interface Post {
	id: string;
	userId: string;
	createdBy?: string; // Primary field for post author
	username: string;
	imageUrl?: string; // Legacy field - use mediaUrls array for multi-image support
	mediaUrl?: string; // Legacy field - single image URL (will be normalized to mediaUrls)
	// NEW: mediaUrls is the primary field for multi-image posts (Instagram-like)
	// Array of image URLs - mediaUrls[0] is used as grid thumbnail
	mediaUrls?: string[];
	// CRITICAL: media is ALWAYS an array, never a single string
	// Each item has: { type: 'image' | 'video', url: string, uri?: string, id?: string }
	media?: Array<{
		type: 'image' | 'video';
		url: string; // Primary field
		uri?: string; // Backward compatibility
		id?: string;
	}>;
	caption?: string;
	likeCount: number;
	commentCount: number;
	shareCount?: number;
	likedBy?: string[];
	savedBy?: string[];
	sharedBy?: string[]; // Track who shared the post
	createdAt: number;
	placeName?: string;
	location?: string;
	profilePhoto?: string;
	coverImage?: string;
	details?: string; // Additional post details
	aspectRatio?: number; // Store aspect ratio for proper display (legacy)
	ratio?: '1:1' | '4:5' | '16:9'; // Store aspect ratio as string for proper display (aspect of FIRST image)
}

export interface TripPackage {
	id: string;
	hostId: string;
	username: string;
	title: string;
	description: string;
	price: number; // in smallest currency unit if needed
	images: string[];
	startDate?: number;
	endDate?: number;
	location?: string;
	createdAt: number;
}

export interface Comment {
	id: string;
	postId: string;
	userId: string;
	username: string;
	text: string;
	createdAt: number;
}

export interface ChatMessage {
	id: string;
	threadId: string; // `${minUid}_${maxUid}` between two users
	senderId: string;
	recipientId: string;
	text?: string;
	imageUrl?: string;
	createdAt: number;
}

// ---------- Firebase Instances ----------

// Wrapper functions for backward compatibility
function db() {
	return firebaseDb;
}

function storage() {
	return firebaseStorage;
}

// ---------- Helpers ----------

const SYSTEM_EMAIL_DOMAIN = 'sanchari.app';

function synthesizeEmailFromUsername(username: string) {
	return `${username.toLowerCase()}@${SYSTEM_EMAIL_DOMAIN}`;
}

async function usernameAvailable(username: string): Promise<boolean> {
	const snap = await withRetry(() => getDoc(doc(db(), 'usernames', username.toLowerCase())));
	return !snap.exists();
}

async function reserveUsername(username: string, uid: string): Promise<void> {
	await withRetry(() => setDoc(doc(db(), 'usernames', username.toLowerCase()), { uid }));
}

async function releaseUsername(username: string): Promise<void> {
	// For future use; not exposed now
	// await deleteDoc(doc(db(), 'usernames', username.toLowerCase()));
}

function nowMs() {
	return Date.now();
}

// ---------- Auth & Profiles ----------

export async function signUpWithUsernamePassword(params: {
	username: string;
	password: string;
	displayName?: string;
	photoURL?: string;
}): Promise<UserProfile> {
	const { username, password, displayName, photoURL } = params;
	const cleanUsername = username.trim().toLowerCase();
	if (!cleanUsername) throw new Error('Username required');
	if (cleanUsername.includes('@')) throw new Error('Username cannot contain @');
	if (password.length < 6) throw new Error('Password must be at least 6 characters');

	if (!(await usernameAvailable(cleanUsername))) {
		throw new Error('Username is already taken');
	}

	const email = synthesizeEmailFromUsername(cleanUsername);
	console.log('📝 Creating Firebase Auth user with email:', email);
	const cred = await createUserWithEmailAndPassword(auth, email, password);
	const user = cred.user;
	console.log('✅ Firebase Auth user created:', user.uid);

	if (displayName || photoURL) {
		await updateProfile(user, { displayName: displayName ?? undefined, photoURL: photoURL ?? undefined });
	}

	await reserveUsername(cleanUsername, user.uid);
	console.log('✅ Username reserved in Firestore:', cleanUsername);

	const profile: UserProfile = {
		id: user.uid,
		username: cleanUsername,
		displayName: displayName,
		photoURL: photoURL,
		role: 'traveler',
		createdAt: nowMs(),
		updatedAt: nowMs(),
	};

	console.log('📝 Creating Firestore user document:', user.uid);
	await withRetry(() => setDoc(doc(db(), 'users', user.uid), profile));
	console.log('✅ User profile saved to Firestore:', user.uid);
	console.log('🎉 Signup complete - User ID:', user.uid, 'Username:', cleanUsername);
	return profile;
}

export async function signInWithUsernamePassword(username: string, password: string): Promise<{
	authUser: FirebaseUser;
	profile: UserProfile | null;
}> {
	const cleanUsername = username.trim().toLowerCase();
	if (!cleanUsername) throw new Error('Username required');
	const email = synthesizeEmailFromUsername(cleanUsername);
	const cred = await signInWithEmailAndPassword(auth, email, password);
	const profileSnap = await withRetry(() => getDoc(doc(db(), 'users', cred.user.uid)));
	return { authUser: cred.user, profile: profileSnap.exists() ? (profileSnap.data() as UserProfile) : null };
}

export async function completeProfile(uid: string, updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'email' | 'phone' | 'bio'>>): Promise<void> {
	const userRef = doc(db(), 'users', uid);
	const snap = await withRetry(() => getDoc(userRef));
	if (!snap.exists()) throw new Error('Profile not found');
	await withRetry(() => updateDoc(userRef, { ...updates, updatedAt: nowMs() }));
}

export async function upgradeToHost(uid: string): Promise<void> {
	const userRef = doc(db(), 'users', uid);
	await withRetry(() => updateDoc(userRef, { role: 'host', updatedAt: nowMs() }));
}

export async function saveUserTravelPlan(uid: string, planData: { selectedTypes: string[] }): Promise<void> {
	try {
		const userRef = doc(db(), 'users', uid);
		await withRetry(() => updateDoc(userRef, {
			travelPlan: planData,
			travelPlanUpdatedAt: nowMs(),
			updatedAt: nowMs(),
		}));
		console.log('✅ Travel plan saved for user:', uid, planData);
	} catch (e: any) {
		console.error('❌ Failed to save travel plan:', e?.message || e);
		throw e;
	}
}

// ---------- Auth Management ----------

export async function checkUsernameAvailability(username: string): Promise<boolean> {
	return await usernameAvailable(username);
}

export async function forgotPassword(identifier: string): Promise<void> {
	try {
		if (!identifier || identifier.trim().length === 0) {
			throw new Error('Email or username is required');
		}

		let email: string;
		if (identifier.includes('@')) {
			email = identifier.trim().toLowerCase();
		} else {
			const cleanUsername = identifier.trim().toLowerCase();
			// Synthesize email directly since we use that convention
			email = synthesizeEmailFromUsername(cleanUsername);

			// Try to find real email if possible
			try {
				const usernameDoc = await getDoc(doc(db(), 'usernames', cleanUsername));
				if (usernameDoc.exists()) {
					const { uid } = usernameDoc.data();
					const userDoc = await getDoc(doc(db(), 'users', uid));
					if (userDoc.exists()) {
						email = (userDoc.data() as UserProfile).email || email;
					}
				}
			} catch (e) {
				// Fallback to synthesized
			}
		}

		console.log('📧 Sending password reset email to:', email);
		await sendPasswordResetEmail(auth, email);
	} catch (error: any) {
		console.error('❌ Forgot password error:', error);
		if (error.code === 'auth/user-not-found') throw new Error('Email/username not found');
		throw error;
	}
}

export async function changePassword(newPassword: string): Promise<void> {
	const user = auth.currentUser;
	if (!user) throw new Error('No user signed in');
	if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

	await updatePassword(user, newPassword);
	try {
		await updateDoc(doc(db(), 'users', user.uid), {
			passwordChangedAt: Date.now(),
			updatedAt: Date.now(),
		});
	} catch (e) {/* ignore */ }
}

export async function signOut(): Promise<void> {
	try {
		await firebaseSignOut(auth);
	} catch (error) {
		console.error('Sign out error:', error);
		throw error;
	}
}

export async function getCurrentUserData(): Promise<UserProfile | null> {
	const user = auth.currentUser;
	if (!user) return null;
	try {
		const snap = await getDoc(doc(db(), 'users', user.uid));
		return snap.exists() ? (snap.data() as UserProfile) : null;
	} catch (e) {
		console.error('Error getting current user data:', e);
		return null;
	}
}

export function getCurrentUserId(): string | null {
	return auth.currentUser?.uid || null;
}

export function isAuthenticated(): boolean {
	return auth.currentUser !== null;
}

export async function requireAuth(action: string): Promise<boolean> {
	if (auth.currentUser) return true;

	// Wait brief moment for auth state to settle
	await new Promise(resolve => setTimeout(resolve, 500));

	if (auth.currentUser) return true;

	Alert.alert(
		'Login Required',
		`You must be logged in to ${action}. Please sign in and try again.`,
		[{ text: 'OK' }]
	);
	return false;
}

// ---------- Storage ----------

// Helper function to convert base64 string to blob
function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
	try {
		// Remove data URL prefix if present (e.g., "data:image/jpeg;base64,...")
		let cleanBase64 = base64.trim();
		if (cleanBase64.includes(',')) {
			cleanBase64 = cleanBase64.split(',')[1];
		}

		// Decode base64 to binary
		const byteCharacters = atob(cleanBase64);
		const byteNumbers = new Array(byteCharacters.length);
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}
		const byteArray = new Uint8Array(byteNumbers);
		return new Blob([byteArray], { type: mimeType });
	} catch (error: any) {
		console.error('❌ Error converting base64 to blob:', error);
		throw new Error(`Failed to convert base64 to blob: ${error.message}`);
	}
}

// Helper function to read file as base64 (React Native compatible)
// Uses XMLHttpRequest with arraybuffer which works better in React Native
async function readFileAsBase64(uri: string): Promise<string> {
	return new Promise((resolve, reject) => {
		console.log('📖 Starting file read for:', uri.substring(0, 60) + '...');

		// Try different URI formats for React Native compatibility
		const urisToTry: string[] = [uri];
		if (Platform.OS === 'android') {
			if (uri.startsWith('file:///')) {
				// Android often has triple slash
				urisToTry.push(uri);
				urisToTry.push(uri.replace('file:///', 'file://'));
				urisToTry.push(uri.replace('file:///', ''));
			} else if (uri.startsWith('file://')) {
				urisToTry.push(uri.replace('file://', ''));
			}
		}

		let attempts = 0;
		const maxAttempts = urisToTry.length;

		function tryNextUri() {
			if (attempts >= maxAttempts) {
				reject(new Error('All URI format attempts failed'));
				return;
			}

			const testUri = urisToTry[attempts++];
			console.log(`📤 Attempt ${attempts}/${maxAttempts}: Trying URI format...`);

			const xhr = new XMLHttpRequest();
			xhr.open('GET', testUri, true);
			xhr.responseType = 'arraybuffer';

			xhr.onload = function () {
				console.log(`📊 XHR status for URI ${attempts}:`, xhr.status);
				if (xhr.status === 200 || xhr.status === 0) {
					try {
						const arrayBuffer = xhr.response;
						if (!arrayBuffer || arrayBuffer.byteLength === 0) {
							if (attempts < maxAttempts) {
								console.log('⚠️ Empty response, trying next URI format...');
								tryNextUri();
							} else {
								reject(new Error('Empty file response'));
							}
							return;
						}

						console.log('✅ Got arraybuffer, size:', arrayBuffer.byteLength);
						const bytes = new Uint8Array(arrayBuffer);

						// Convert to base64 in chunks to avoid stack overflow
						let binary = '';
						const chunkSize = 8192;
						for (let i = 0; i < bytes.byteLength; i += chunkSize) {
							const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
							binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
						}

						const base64 = btoa(binary);
						console.log('✅ Converted to base64, length:', base64.length);
						resolve(base64);
					} catch (e: any) {
						console.error('❌ Error converting to base64:', e);
						if (attempts < maxAttempts) {
							tryNextUri();
						} else {
							reject(new Error(`Failed to convert to base64: ${e.message}`));
						}
					}
				} else {
					if (attempts < maxAttempts) {
						console.log(`⚠️ XHR status ${xhr.status}, trying next URI format...`);
						tryNextUri();
					} else {
						reject(new Error(`XHR status: ${xhr.status}`));
					}
				}
			};

			xhr.onerror = function (e) {
				console.error(`❌ XHR error for attempt ${attempts}:`, e);
				if (attempts < maxAttempts) {
					console.log('⚠️ XHR error, trying next URI format...');
					tryNextUri();
				} else {
					reject(new Error('Failed to read file - XHR error'));
				}
			};

			xhr.ontimeout = function () {
				console.error(`⏱️ XHR timeout for attempt ${attempts}`);
				if (attempts < maxAttempts) {
					tryNextUri();
				} else {
					reject(new Error('Timeout reading file'));
				}
			};

			xhr.timeout = 30000;

			try {
				xhr.send(null);
			} catch (sendError: any) {
				console.error(`❌ Failed to send XHR for attempt ${attempts}:`, sendError.message);
				if (attempts < maxAttempts) {
					tryNextUri();
				} else {
					reject(new Error(`Failed to send XHR request: ${sendError.message}`));
				}
			}
		}

		tryNextUri();
	});
}

/**
 * ------------------------------------------------------------------
 * STRICT UPLOAD CONTRACT
 * ------------------------------------------------------------------
 * 1. This service must NOT infer auth state for data ownership.
 * 2. Caller MUST explicitly pass `userId`.
 * 3. `userId` must be validated (non-empty string).
 * 4. All uploads enforce canonical path: `users/{userId}/{folder}/{fileName}`
 * ------------------------------------------------------------------
 */

// Native-first image upload with strict contract
export async function uploadImageAsync(
	imageAsset: { uri: string },
	userId: string,
	folder: string = 'posts'
): Promise<string> {
	// 1. Validate inputs immediately
	if (!userId || typeof userId !== 'string' || userId.trim() === '') {
		throw new Error('❌ uploadImageAsync: Valid userId is REQUIRED with strict contract.');
	}
	if (!imageAsset || !imageAsset.uri) {
		throw new Error('❌ uploadImageAsync: Image URI is required.');
	}

	// 2. Ensure Auth (Optional but recommended for security context, though we don't use the uid from it)
	if (!auth.currentUser) {
		console.warn('⚠️ uploadImageAsync: No authenticated user found in SDK. Upload might fail due to security rules.');
	}

	try {
		// 3. Construct Canonical Path
		// Pattern: users/{userId}/{folder}/{fileName}
		const timestamp = Date.now();
		const randomStr = Math.random().toString(36).substring(7);
		const fileName = `${timestamp}_${randomStr}.jpg`;
		const storagePath = `users/${userId}/${folder}/${fileName}`;

		console.log(`🚀 [Strict Upload] Starting upload to: ${storagePath}`);

		const reference = firebaseStorage.ref(storagePath);

		// Handle file URI for React Native (iOS file:// removal)
		const pathToFile = Platform.OS === 'ios' ? String(imageAsset.uri).replace('file://', '') : String(imageAsset.uri);

		// 4. Perform Upload
		await reference.putFile(pathToFile);
		const downloadURL = await reference.getDownloadURL();

		console.log('✅ [Strict Upload] Success! URL:', downloadURL);
		return downloadURL;

	} catch (error: any) {
		console.error('🔥 [Strict Upload] Failed:', error);
		throw new Error(`Upload failed: ${error.message}`);
	}
}

// ---------- Posts ----------

export async function createPost(params: {
	userId: string;
	username: string;
	imageUrl: string;
	caption?: string;
	userAvatar?: string; // Optional user avatar, fetched if missing
}): Promise<Post> {
	if (!auth.currentUser) throw new Error('User not authenticated');

	// Fetch user avatar if not provided
	let userAvatar = params.userAvatar;
	if (!userAvatar) {
		try {
			const userDoc = await getDoc(doc(db(), 'users', params.userId));
			if (userDoc.exists()) {
				const userData = userDoc.data();
				userAvatar = userData.profilePhoto || userData.photoURL || null;
			}
		} catch (e) {
			console.warn('⚠️ Could not fetch user avatar for post creation:', e);
		}
	}

	const base = {
		createdBy: params.userId, // Primary field
		userId: params.userId, // Legacy field for backward compatibility
		username: params.username,
		// Ensure userAvatar is stored for static display
		userAvatar: userAvatar || null,
		profilePhoto: userAvatar || null, // Legacy compatibility
		imageUrl: params.imageUrl,
		caption: params.caption ?? '',
		likeCount: 0,
		commentCount: 0,
		shareCount: 0,
		likedBy: [],
		savedBy: [],
		sharedBy: [],
		createdAt: serverTimestamp(), // Always use serverTimestamp
	};
	const ref = await withRetry(() => addDoc(collection(db(), 'posts'), base));
	return { id: ref.id, ...base } as unknown as Post;
}

export async function createReel(params: {
	userId: string;
	username: string;
	videoUrl: string;
	caption?: string;
	userAvatar?: string;
}): Promise<any> {
	if (!auth.currentUser) throw new Error('User not authenticated');

	// Fetch user avatar if not provided
	let userAvatar = params.userAvatar;
	if (!userAvatar) {
		try {
			const userDoc = await getDoc(doc(db(), 'users', params.userId));
			if (userDoc.exists()) {
				const userData = userDoc.data();
				userAvatar = userData.profilePhoto || userData.photoURL || null;
			}
		} catch (e) {
			console.warn('⚠️ Could not fetch user avatar for reel creation:', e);
		}
	}

	const base = {
		createdBy: params.userId, // Primary field
		userId: params.userId, // Legacy field for backward compatibility
		username: params.username,
		// Ensure userAvatar is stored for static display
		userAvatar: userAvatar || null,
		profilePhoto: userAvatar || null, // Legacy compatibility
		videoUrl: params.videoUrl,
		caption: params.caption ?? '',
		likeCount: 0,
		commentCount: 0,
		shareCount: 0,
		likedBy: [],
		savedBy: [],
		sharedBy: [],
		createdAt: serverTimestamp(), // Always use serverTimestamp
	};
	const ref = await withRetry(() => addDoc(collection(db(), 'reels'), base));
	return { id: ref.id, ...base };
}

/**
 * Delete a post completely from everywhere
 * - Deletes from posts collection
 * - Deletes media from Firebase Storage
 * - Decrements postsCount in user document
 * - Deletes from likes/bookmarks collections if they exist
 */
export async function deletePost(postId: string, ownerId: string): Promise<void> {
	try {
		// Step 1: Get post data to extract media URLs
		const postRef = doc(db(), 'posts', postId);
		const postSnap = await getDoc(postRef);

		if (!postSnap.exists()) {
			throw new Error('Post not found');
		}

		const postData = postSnap.data() as any;

		// Step 2: Delete media from Firebase Storage
		const mediaUrls: string[] = [];

		// Collect all media URLs
		if (postData.mediaUrls && Array.isArray(postData.mediaUrls)) {
			mediaUrls.push(...postData.mediaUrls);
		}
		if (postData.imageUrl) {
			mediaUrls.push(postData.imageUrl);
		}
		if (postData.mediaUrl) {
			mediaUrls.push(postData.mediaUrl);
		}
		if (postData.coverImage) {
			mediaUrls.push(postData.coverImage);
		}
		if (postData.finalCroppedUrl) {
			mediaUrls.push(postData.finalCroppedUrl);
		}
		if (postData.media && Array.isArray(postData.media)) {
			postData.media.forEach((item: any) => {
				if (item.url) mediaUrls.push(item.url);
				if (item.uri) mediaUrls.push(item.uri);
			});
		}

		// Remove duplicates
		const uniqueMediaUrls = [...new Set(mediaUrls)];

		// Delete each media file from Storage
		for (const url of uniqueMediaUrls) {
			if (!url || typeof url !== 'string' || !url.includes('firebasestorage')) continue;

			try {
				// Extract storage path from URL
				// URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
				const urlObj = new URL(url);
				const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
				if (pathMatch && pathMatch[1]) {
					const encodedPath = pathMatch[1];
					const storagePath = decodeURIComponent(encodedPath);

					// Delete using React Native Firebase Storage
					const storageRef = firebaseStorage.ref(storagePath);
					await storageRef.delete();
					console.log('✅ Deleted media from Storage:', storagePath);
				}
			} catch (storageError: any) {
				// Log but don't fail - file might already be deleted
				console.warn('⚠️ Could not delete media from Storage:', url, storageError.message);
			}
		}

		// Step 3: Delete from main posts collection
		await deleteDoc(postRef);
		console.log('✅ Deleted post from posts collection');

		// Step 4: Delete from user's posts subcollection (if exists)
		try {
			const userPostRef = doc(db(), 'users', ownerId, 'posts', postId);
			const userPostSnap = await getDoc(userPostRef);
			if (userPostSnap.exists()) {
				await deleteDoc(userPostRef);
				console.log('✅ Deleted post from user posts subcollection');
			}
		} catch (error: any) {
			// Subcollection might not exist, that's okay
			console.log('ℹ️ User posts subcollection not found or already deleted');
		}

		// Step 5: Delete from explore/feed collections (if they exist)
		const feedCollections = ['explore', 'feed/global', 'user_feed'];
		for (const collectionPath of feedCollections) {
			try {
				const feedRef = doc(db(), collectionPath, postId);
				const feedSnap = await getDoc(feedRef);
				if (feedSnap.exists()) {
					await deleteDoc(feedRef);
					console.log(`✅ Deleted post from ${collectionPath}`);
				}
			} catch (error: any) {
				// Collection might not exist, that's okay
				console.log(`ℹ️ ${collectionPath} not found or already deleted`);
			}
		}

		// Step 6: Delete from likes/bookmarks collections (if they exist as separate docs)
		const interactionCollections = ['likes', 'bookmarks'];
		for (const collectionPath of interactionCollections) {
			try {
				const interactionRef = doc(db(), collectionPath, postId);
				const interactionSnap = await getDoc(interactionRef);
				if (interactionSnap.exists()) {
					await deleteDoc(interactionRef);
					console.log(`✅ Deleted post from ${collectionPath}`);
				}
			} catch (error: any) {
				// Collection might not exist, that's okay
				console.log(`ℹ️ ${collectionPath} not found or already deleted`);
			}
		}

		// Step 7: Decrement postsCount in user document
		try {
			const userRef = doc(db(), 'users', ownerId);
			await updateDoc(userRef, {
				postsCount: increment(-1),
			});
			console.log('✅ Decremented postsCount');
		} catch (error: any) {
			// postsCount might not exist, that's okay
			console.log('ℹ️ Could not decrement postsCount (field might not exist)');
		}

		console.log('✅ Post deleted successfully from all locations');
	} catch (error: any) {
		console.error('❌ Error deleting post:', error);
		throw error;
	}
}

export function listenToFeed(onUpdate: (posts: Post[]) => void): () => void {
	const q = query(collection(db(), 'posts'), orderBy('createdAt', 'desc'));
	return onSnapshot(q, (snap) => {
		const posts: Post[] = snap.docs
			.map((d) => {
				const data = d.data();
				// Skip posts without createdAt
				if (!data.createdAt) return null;
				return { id: d.id, ...data };
			})
			.filter((post): post is Post => post !== null);
		onUpdate(posts);
	}, (error: any) => {
		// Suppress Firestore internal assertion errors (non-fatal SDK bugs)
		if (error?.message?.includes('INTERNAL ASSERTION FAILED') || error?.message?.includes('Unexpected state')) {
			console.warn('⚠️ Firestore internal error (non-fatal, will retry):', error.message?.substring(0, 100));
			return; // Don't log full error, just suppress it
		}
		if (error.code === 'failed-precondition') {
			console.warn('Firestore query error: ensure createdAt exists.');
		} else {
			console.warn('listenToFeed error:', error?.message || error);
		}
	});
}

export async function toggleLikePost(postId: string, userId: string): Promise<boolean> {
	const ref = doc(db(), 'posts', postId);

	// Use withRetry wrapper to handle version conflicts and other transient errors
	return await withRetry(async () => {
		return await runTransaction(db(), async (transaction) => {
			const snap = await transaction.get(ref);
			if (!snap.exists()) throw new Error('Post not found');

			const data = snap.data() as any;
			const likedBy = data.likedBy || [];
			const currentLikeCount = Math.max(0, data.likeCount || 0);
			const isLiked = likedBy.includes(userId);

			// Prevent double-like/unlike by checking current state
			if (isLiked) {
				// Unlike: remove from array and decrement count (never go below 0)
				// Double-check: ensure user is actually in the array
				if (!likedBy.includes(userId)) {
					// User not in array, nothing to do
					return false;
				}

				const newLikedBy = likedBy.filter((id: string) => id !== userId);
				const newLikeCount = Math.max(0, currentLikeCount - 1);

				transaction.update(ref, {
					likedBy: newLikedBy,
					likeCount: newLikeCount,
				});
				return false;
			} else {
				// Like: add to array and increment count
				// Double-check: ensure user is not already in the array
				if (likedBy.includes(userId)) {
					// User already in array, nothing to do
					return true;
				}

				const newLikedBy = [...likedBy, userId];
				const newLikeCount = currentLikeCount + 1;

				transaction.update(ref, {
					likedBy: newLikedBy,
					likeCount: newLikeCount,
				});
				return true;
			}
		});
	}, { retries: 3, initialDelayMs: 100 }); // Retry up to 3 times with 100ms initial delay
}

export async function likePost(postId: string): Promise<void> {
	const user = auth.currentUser;
	if (!user) throw new Error('User not authenticated');
	await toggleLikePost(postId, user.uid);
}

export async function unlikePost(postId: string): Promise<void> {
	const user = auth.currentUser;
	if (!user) throw new Error('User not authenticated');
	await toggleLikePost(postId, user.uid);
}

export async function addComment(params: { postId: string; userId: string; username: string; text: string }): Promise<Comment> {
	const base = {
		postId: params.postId,
		userId: params.userId,
		username: params.username,
		text: params.text,
		createdAt: nowMs(),
	};
	const ref = await withRetry(() => addDoc(collection(db(), 'comments'), base));

	// Update commentCount atomically - only increment, never decrement
	const postRef = doc(db(), 'posts', params.postId);
	await withRetry(() => updateDoc(postRef, {
		commentCount: increment(1),
	}));

	return { id: ref.id, ...base } as Comment;
}

export function listenToComments(postId: string, onUpdate: (comments: Comment[]) => void): () => void {
	const q = query(collection(db(), 'comments'), where('postId', '==', postId), orderBy('createdAt', 'asc'));
	return onSnapshot(q, (snap) => {
		const comments: Comment[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
		onUpdate(comments);
	}, (error) => {
		console.log('listenToComments error:', error?.message || error);
	});
}

// Toggle share post - increment/decrement share count
export async function toggleSharePost(postId: string, userId: string): Promise<boolean> {
	const ref = doc(db(), 'posts', postId);

	return await runTransaction(db(), async (transaction) => {
		const snap = await transaction.get(ref);
		if (!snap.exists()) throw new Error('Post not found');

		const data = snap.data() as any;
		const sharedBy = data.sharedBy || [];
		const currentShareCount = Math.max(0, data.shareCount || 0);
		const hasShared = sharedBy.includes(userId);

		if (hasShared) {
			// Unshare: remove from array and decrement count (never go below 0)
			const newSharedBy = sharedBy.filter((id: string) => id !== userId);
			const newShareCount = Math.max(0, currentShareCount - 1);

			transaction.update(ref, {
				sharedBy: newSharedBy,
				shareCount: newShareCount,
			});
			return false;
		} else {
			// Share: add to array and increment count
			const newSharedBy = [...sharedBy, userId];
			const newShareCount = currentShareCount + 1;

			transaction.update(ref, {
				sharedBy: newSharedBy,
				shareCount: newShareCount,
			});
			return true;
		}
	});
}

// Legacy function for backward compatibility - always increments
export async function sharePost(postId: string): Promise<void> {
	const user = auth.currentUser;
	if (!user) throw new Error('User not authenticated');
	await toggleSharePost(postId, user.uid);
}

// Toggle bookmark/save post
export async function toggleBookmarkPost(postId: string, userId: string): Promise<boolean> {
	const ref = doc(db(), 'posts', postId);
	const snap = await withRetry(() => getDoc(ref));
	if (!snap.exists()) throw new Error('Post not found');

	const data = snap.data() as any;
	const savedBy = data.savedBy || [];
	const isSaved = savedBy.includes(userId);

	if (isSaved) {
		// Unsave: remove from array
		await withRetry(() => updateDoc(ref, {
			savedBy: arrayRemove(userId),
		}));
		return false;
	} else {
		// Save: add to array
		await withRetry(() => updateDoc(ref, {
			savedBy: arrayUnion(userId),
		}));
		return true;
	}
}

// Get saved posts for a user
export function listenToSavedPosts(userId: string, onUpdate: (posts: Post[]) => void): () => void {
	const q = query(collection(db(), 'posts'), where('savedBy', 'array-contains', userId), orderBy('createdAt', 'desc'));
	return onSnapshot(q, (snap) => {
		const posts: Post[] = snap.docs
			.map((d) => {
				const data = d.data();
				if (!data.createdAt) return null;
				return { id: d.id, ...data } as Post;
			})
			.filter((post): post is Post => post !== null);
		onUpdate(posts);
	}, (error) => {
		console.log('listenToSavedPosts error:', error?.message || error);
	});
}

// ---------- Trips (Host packages) ----------

export async function createTripPackage(params: {
	hostId: string;
	username: string;
	title: string;
	description: string;
	price: number;
	images: string[];
	startDate?: number;
	endDate?: number;
	location?: string;
}): Promise<TripPackage> {
	const base = {
		hostId: params.hostId,
		username: params.username,
		title: params.title,
		description: params.description,
		price: params.price,
		images: params.images,
		startDate: params.startDate ?? null,
		endDate: params.endDate ?? null,
		location: params.location ?? '',
		createdAt: nowMs(),
	};
	const ref = await withRetry(() => addDoc(collection(db(), 'trips'), base));
	return { id: ref.id, ...base } as TripPackage;
}

export function listenToTrips(onUpdate: (trips: TripPackage[]) => void): () => void {
	const q = query(collection(db(), 'trips'), orderBy('createdAt', 'desc'));
	return onSnapshot(q, (snap) => {
		const trips: TripPackage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
		onUpdate(trips);
	}, (error) => {
		console.log('listenToTrips error:', error?.message || error);
	});
}

// ---------- Chat ----------

function threadIdFor(u1: string, u2: string) {
	return [u1, u2].sort().join('_');
}

export async function sendMessage(params: {
	senderId: string;
	recipientId: string;
	text?: string;
	imageUrl?: string;
}): Promise<ChatMessage> {
	const base = {
		threadId: threadIdFor(params.senderId, params.recipientId),
		senderId: params.senderId,
		recipientId: params.recipientId,
		text: params.text ?? '',
		imageUrl: params.imageUrl ?? '',
		createdAt: nowMs(),
	};
	const ref = await withRetry(() => addDoc(collection(db(), 'messages'), base));
	return { id: ref.id, ...base } as ChatMessage;
}

export function listenToDirectMessages(a: string, b: string, onUpdate: (messages: ChatMessage[]) => void): () => void {
	const tid = threadIdFor(a, b);
	const q = query(collection(db(), 'messages'), where('threadId', '==', tid), orderBy('createdAt', 'asc'));
	return onSnapshot(q, (snap) => {
		const msgs: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
		onUpdate(msgs);
	}, (error) => {
		console.log('listenToDirectMessages error:', error?.message || error);
	});
}

// ---------- Utilities for UI ----------

export async function isUsernameAvailable(username: string): Promise<boolean> {
	return usernameAvailable(username);
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
	const user = auth.currentUser;
	if (!user) return null;
	const snap = await withRetry(() => getDoc(doc(db(), 'users', user.uid)));
	return snap.exists() ? (snap.data() as UserProfile) : null;
}

/**
 * Report a post/user
 * Creates a report entry in /reports collection
 * 
 * Future: Add analytics.reportCount++ when analytics system is implemented
 */
export async function reportPost(
	reporterId: string,
	reportedUserId: string,
	postId: string
): Promise<void> {
	try {
		const reportRef = doc(collection(db(), 'reports'));
		await setDoc(reportRef, {
			reporterId,
			reportedUserId,
			postId,
			createdAt: serverTimestamp(),
		});
		console.log('✅ Post reported successfully');
		// TODO: analytics.reportCount++ (when analytics system is implemented)
	} catch (error: any) {
		console.error('❌ Error reporting post:', error);
		throw error;
	}
}

/**
 * Block a user
 * Adds userId to /users/{currentUser.uid}/blockedUsers array
 * Also removes follow relationship if exists
 * 
 * Future: Add analytics.blockCount++ when analytics system is implemented
 */
export async function blockUser(currentUserId: string, blockedUserId: string): Promise<void> {
	try {
		const userRef = doc(db(), 'users', currentUserId);

		// Add to blockedUsers array
		await updateDoc(userRef, {
			blockedUsers: arrayUnion(blockedUserId),
		});

		// Remove follow relationship if exists
		const followId = `${currentUserId}_${blockedUserId}`;
		const followRef = doc(db(), 'follows', followId);
		const followSnap = await getDoc(followRef);

		if (followSnap.exists()) {
			await deleteDoc(followRef);
			// Update counts
			await runTransaction(db(), async (transaction) => {
				const currentUserRef = doc(db(), 'users', currentUserId);
				const blockedUserRef = doc(db(), 'users', blockedUserId);

				const currentUserDoc = await transaction.get(currentUserRef);
				const blockedUserDoc = await transaction.get(blockedUserRef);

				if (currentUserDoc.exists()) {
					const currentCount = currentUserDoc.data().followingCount || 0;
					transaction.update(currentUserRef, {
						followingCount: Math.max(0, currentCount - 1),
					});
				}

				if (blockedUserDoc.exists()) {
					const targetCount = blockedUserDoc.data().followersCount || 0;
					transaction.update(blockedUserRef, {
						followersCount: Math.max(0, targetCount - 1),
					});
				}
			});
		}

		console.log('✅ User blocked successfully');
		// TODO: analytics.blockCount++ (when analytics system is implemented)
	} catch (error: any) {
		console.error('❌ Error blocking user:', error);
		throw error;
	}
}

/**
 * Hide a post
 * Adds postId to /users/{currentUser.uid}/hiddenPosts array
 * 
 * Future: Add analytics.hideCount++ when analytics system is implemented
 */
export async function hidePost(currentUserId: string, postId: string): Promise<void> {
	try {
		const userRef = doc(db(), 'users', currentUserId);
		await updateDoc(userRef, {
			hiddenPosts: arrayUnion(postId),
		});
		console.log('✅ Post hidden successfully');
		// TODO: analytics.hideCount++ (when analytics system is implemented)
	} catch (error: any) {
		console.error('❌ Error hiding post:', error);
		throw error;
	}
}

/**
 * Mute a user
 * Adds userId to /users/{currentUser.uid}/mutedUsers array
 */
export async function muteUser(currentUserId: string, mutedUserId: string): Promise<void> {
	try {
		const userRef = doc(db(), 'users', currentUserId);
		await updateDoc(userRef, {
			mutedUsers: arrayUnion(mutedUserId),
		});
		console.log('✅ User muted successfully');
	} catch (error: any) {
		console.error('❌ Error muting user:', error);
		throw error;
	}
}

/**
 * Unfollow a user
 * Removes from /follows collection and updates follower/following counts
 * Note: This is a service function. The useFollow hook also provides unfollow functionality.
 */
export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
	try {
		const followId = `${currentUserId}_${targetUserId}`;
		const followRef = doc(db(), 'follows', followId);

		// Check if follow relationship exists
		const followSnap = await getDoc(followRef);
		if (!followSnap.exists()) {
			console.log('ℹ️ Follow relationship does not exist');
			return;
		}

		// Delete follow document
		await deleteDoc(followRef);

		// Update counts in transaction
		await runTransaction(db(), async (transaction) => {
			const currentUserRef = doc(db(), 'users', currentUserId);
			const targetUserRef = doc(db(), 'users', targetUserId);

			const currentUserDoc = await transaction.get(currentUserRef);
			const targetUserDoc = await transaction.get(targetUserRef);

			if (currentUserDoc.exists()) {
				const currentCount = currentUserDoc.data().followingCount || 0;
				transaction.update(currentUserRef, {
					followingCount: Math.max(0, currentCount - 1),
				});
			}

			if (targetUserDoc.exists()) {
				const targetCount = targetUserDoc.data().followersCount || 0;
				transaction.update(targetUserRef, {
					followersCount: Math.max(0, targetCount - 1),
				});
			}
		});

		console.log('✅ User unfollowed successfully');
	} catch (error: any) {
		console.error('❌ Error unfollowing user:', error);
		throw error;
	}
}

/**
 * Upload profile photo
 * Converts finalImage to blob and uploads to /profilePhotos/{userId}/{userId}.jpg
 * Returns downloadURL
 */
export async function uploadProfilePhoto(finalImageUri: string, userId: string): Promise<string> {
	try {
		// Use fileName format to match storage rules pattern: users/{userId}/profile_photos/{fileName}
		const fileName = `${userId}.jpg`;
		const storagePath = `users/${userId}/profile_photos/${fileName}`;
		const reference = firebaseStorage.ref(storagePath);

		// Prepare upload URI (remove file:// prefix if present)
		let uploadUri = finalImageUri;
		if (Platform.OS === 'ios' && uploadUri.startsWith('file://')) {
			uploadUri = uploadUri.replace('file://', '');
		}
		if (Platform.OS === 'android' && uploadUri.startsWith('file://')) {
			uploadUri = uploadUri.replace('file://', '');
		}

		console.log('📤 [uploadProfilePhoto] Uploading profile photo to:', storagePath);
		await reference.putFile(uploadUri);
		const downloadURL = await reference.getDownloadURL();
		console.log('✅ [uploadProfilePhoto] Profile photo uploaded successfully');
		return downloadURL;
	} catch (error: any) {
		console.error('❌ Error uploading profile photo:', error);
		throw error;
	}
}

/**
 * Delete old profile photo
 * Only deletes if previousUrl exists and is not default
 */
export async function deleteOldProfilePhoto(previousUrl: string | null | undefined): Promise<void> {
	if (!previousUrl) {
		console.log('ℹ️ No previous profile photo to delete');
		return;
	}

	// Don't delete default/placeholder URLs
	if (previousUrl.includes('default') || previousUrl.includes('placeholder') || !previousUrl.includes('firebasestorage')) {
		console.log('ℹ️ Skipping deletion of default/placeholder URL');
		return;
	}

	try {
		// Extract storage path from URL
		// URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
		const urlObj = new URL(previousUrl);
		const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
		if (pathMatch && pathMatch[1]) {
			const encodedPath = pathMatch[1];
			const storagePath = decodeURIComponent(encodedPath);

			// Delete using React Native Firebase Storage
			const storageRef = firebaseStorage.ref(storagePath);
			await storageRef.delete();
			console.log('✅ [deleteOldProfilePhoto] Old profile photo deleted:', storagePath);
		} else {
			console.warn('⚠️ [deleteOldProfilePhoto] Could not extract storage path from URL');
		}
	} catch (error: any) {
		// Log but don't fail - file might already be deleted
		console.warn('⚠️ [deleteOldProfilePhoto] Could not delete old profile photo:', error.message);
	}
}

/**
 * Update profile photo in Firestore
 * Updates users/{userId}/profilePhotoUrl and photoURL (legacy field)
 * Includes timestamp for race-condition prevention
 */
export async function updateProfilePhotoInDatabase(userId: string, downloadURL: string): Promise<void> {
	try {
		const userRef = doc(db(), 'users', userId);
		await updateDoc(userRef, {
			profilePhotoUrl: downloadURL,
			photoURL: downloadURL, // Also update legacy field
			profilePhoto: downloadURL, // Also update this field if used
			profilePhotoUpdatedAt: serverTimestamp(), // Race-condition prevention timestamp
			updatedAt: Date.now(),
		});
		console.log('✅ [updateProfilePhotoInDatabase] Profile photo URL updated in Firestore with timestamp');
	} catch (error: any) {
		console.error('❌ Error updating profile photo in database:', error);
		throw error;
	}
}

/**
 * Remove a follower
 * Removes the follow relationship where targetUserId follows currentUserId
 * This is the reverse of unfollow - removes someone who is following you
 */
export async function removeFollower(currentUserId: string, followerUserId: string): Promise<void> {
	try {
		// The follow relationship is: followerUserId follows currentUserId
		const followId = `${followerUserId}_${currentUserId}`;
		const followRef = doc(db(), 'follows', followId);

		// Check if follow relationship exists
		const followSnap = await getDoc(followRef);
		if (!followSnap.exists()) {
			console.log('ℹ️ Follow relationship does not exist');
			return;
		}

		// Delete follow document
		await deleteDoc(followRef);

		// Update counts in transaction
		await runTransaction(db(), async (transaction) => {
			const currentUserRef = doc(db(), 'users', currentUserId);
			const followerUserRef = doc(db(), 'users', followerUserId);

			const currentUserDoc = await transaction.get(currentUserRef);
			const followerUserDoc = await transaction.get(followerUserRef);

			// Decrement followersCount for current user (the one being unfollowed)
			if (currentUserDoc.exists()) {
				const currentCount = currentUserDoc.data().followersCount || 0;
				transaction.update(currentUserRef, {
					followersCount: Math.max(0, currentCount - 1),
				});
			}

			// Decrement followingCount for follower user (the one who was following)
			if (followerUserDoc.exists()) {
				const followerCount = followerUserDoc.data().followingCount || 0;
				transaction.update(followerUserRef, {
					followingCount: Math.max(0, followerCount - 1),
				});
			}
		});

		console.log('✅ Follower removed successfully');
	} catch (error: any) {
		console.error('❌ Error removing follower:', error);
		throw error;
	}
}

export const firebaseApi = {
	// Auth
	signUpWithUsernamePassword,
	signInWithUsernamePassword,
	isUsernameAvailable,
	completeProfile,
	upgradeToHost,
	getCurrentUserProfile,
	saveUserTravelPlan,
	// Storage
	uploadImageAsync,
	// Posts
	createPost,
	deletePost,
	listenToFeed,
	likePost,
	unlikePost,
	addComment,
	listenToComments,
	// Trips
	createTripPackage,
	listenToTrips,
	// Chat
	sendMessage,
	listenToDirectMessages,
	// Diagnostics
	checkFirebaseConnectivity,
};

export default firebaseApi;

// ---------- Retry Helper ----------

async function withRetry<T>(fn: () => Promise<T>, opts?: { retries?: number; initialDelayMs?: number }): Promise<T> {
	const retries = opts?.retries ?? 3;
	const initialDelayMs = opts?.initialDelayMs ?? 500;
	let attempt = 0;
	let lastError: any;
	while (attempt <= retries) {
		try {
			return await fn();
		} catch (e: any) {
			lastError = e;
			const msg = e?.message || '';
			const code = e?.code || '';
			const offlineHint = msg.toLowerCase().includes('offline') || code === 'unavailable';
			if (attempt === 0 && offlineHint) {
				// try to re-enable network once when we first detect offline state
				try { await enableNetwork(db()); } catch { }
			}
			if (attempt >= retries || !offlineHint) break;
			const delay = initialDelayMs * Math.pow(2, attempt);
			await new Promise((res) => setTimeout(res, delay));
			attempt += 1;
		}
	}
	console.log('Firestore operation failed after retries:', lastError?.message || lastError);
	throw lastError;
}

// ---------- Diagnostics ----------

export async function checkFirebaseConnectivity(): Promise<{
	appInitialized: boolean;
	networkEnabled: boolean;
	canWrite: boolean;
	canRead: boolean;
	timestampMs: number;
	details?: string;
}> {
	const timestampMs = Date.now();
	let networkEnabled = false;
	let canWrite = false;
	let canRead = false;
	try {
		await enableNetwork(db());
		networkEnabled = true;
	} catch (e: any) {
		networkEnabled = false;
	}
	const testRef = doc(collection(db(), 'healthcheck'));
	try {
		await withRetry(() => setDoc(testRef, { ok: true, timestampMs }));
		canWrite = true;
	} catch (e: any) {
		canWrite = false;
	}
	try {
		const snap = await withRetry(() => getDoc(testRef));
		canRead = snap.exists();
	} catch (e: any) {
		canRead = false;
	}
	return {
		appInitialized: !!app,
		networkEnabled,
		canWrite,
		canRead,
		timestampMs,
	};
}


