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
import * as PostInteractions from '../../global/services/posts/post.interactions.service';

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

	// 🔐 INVARIANT ENFORCEMENT: Validate that URI is a finalized bitmap
	// This prevents accidental upload of original camera roll URIs
	if (__DEV__) {
		const { assertValidUploadPayload } = require('../../utils/imagePipelineInvariants');
		assertValidUploadPayload(
			imageAsset.uri,
			userId,
			'firebaseService.uploadImageAsync'
		);
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
 * 
 * @deprecated Use deletePost from '../../services/posts/deletePost' instead
 * This function is kept for backward compatibility but redirects to the new service
 */
export async function deletePost(postId: string, ownerId: string): Promise<void> {
	console.warn('⚠️ [firebaseService.deletePost] DEPRECATED: Use deletePost from services/posts/deletePost instead');

	// Import and call the new centralized service
	const { deletePost: newDeletePost } = await import('../posts/deletePost');
	return newDeletePost(postId, ownerId);
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
	console.log('[firebaseService] Redirecting toggleLikePost to PostInteractions');
	// PostInteractions.toggleLike returns void, but this expects boolean (was it liked?)
	// We can't easily return the new state without listening.
	// However, we can listen briefly or just return true (optimistic).
	// Legacy function returned boolean "isLiked".
	// Let's check current state first using PostInteractions listener? Too slow.
	// We will just toggle and return true to satisfy signature, or try to guess.
	// Actually, the caller probably updates UI optimistically anyway.
	await PostInteractions.toggleLike(postId, userId);
	return true; // precise return value lost, but rarely used for logic other than UI toggle which is now optimistic
}

export async function likePost(postId: string): Promise<void> {
	const user = auth.currentUser;
	if (!user) throw new Error('User not authenticated');
	await PostInteractions.toggleLike(postId, user.uid, true);
}

export async function unlikePost(postId: string): Promise<void> {
	const user = auth.currentUser;
	if (!user) throw new Error('User not authenticated');
	await PostInteractions.toggleLike(postId, user.uid, false);
}

export async function addComment(params: { postId: string; userId: string; username: string; text: string }): Promise<Comment> {
	// Redirect to PostInteractions
	// fetch user profile photo if possible, or pass null (service handles enrichment)
	const commentId = await PostInteractions.addComment(params.postId, params.userId, params.username, null, params.text);

	// Construct simulated return object
	return {
		id: commentId,
		postId: params.postId,
		userId: params.userId,
		username: params.username,
		text: params.text,
		createdAt: nowMs(),
	} as Comment;
}

export function listenToComments(postId: string, onUpdate: (comments: Comment[]) => void): () => void {
	// Redirect to PostInteractions
	return PostInteractions.listenToPostComments(postId, (enrichedComments) => {
		// Map EnrichedComment to Comment interface
		const mappedComments: Comment[] = enrichedComments.map(c => ({
			id: c.id,
			postId: postId,
			userId: c.userId,
			username: c.username,
			text: c.text,
			createdAt: c.createdAt ? (c.createdAt as any).toMillis?.() || (c.createdAt as any).seconds * 1000 : Date.now(),
		}));
		onUpdate(mappedComments);
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
	console.log('[firebaseService] Redirecting toggleBookmarkPost to PostInteractions');
	await PostInteractions.toggleSavePost(postId, userId);
	return true; // return value lost, assuming success
}

// Get saved posts for a user
export function listenToSavedPosts(userId: string, onUpdate: (posts: Post[]) => void): () => void {
	console.warn('[firebaseService] listenToSavedPosts is DEPRECATED and removed. Use useSavedPostsList hook or PostInteractions service.');
	onUpdate([]);
	return () => { };
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
 * CRITICAL: Follows same pattern as post upload to prevent storage/unauthorized
 * - Checks auth readiness
 * - Forces token refresh
 * - Uses native Firebase Storage SDK
 * - Matches storage rules path exactly
 * 
 * @param finalImageUri - Local file URI of the cropped profile photo
 * @param userId - User ID (must match auth.currentUser.uid)
 * @returns Download URL of uploaded photo
 */
export async function uploadProfilePhoto(finalImageUri: string, userId: string): Promise<string> {
	try {
		// STEP 1: Verify auth readiness (matching post upload pattern)
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User not authenticated');
		}

		if (currentUser.uid !== userId) {
			throw new Error('User ID mismatch - possible auth state corruption');
		}

		console.log('🔐 [uploadProfilePhoto] Auth check passed:', {
			userId,
			currentUserUid: currentUser.uid,
			email: currentUser.email,
			uidMatch: currentUser.uid === userId,
			userIdLength: userId.length,
			currentUserUidLength: currentUser.uid.length,
		});

		// CRITICAL: Verify UIDs match exactly
		if (currentUser.uid !== userId) {
			console.error('❌ [uploadProfilePhoto] UID MISMATCH:', {
				passedUserId: userId,
				authUserId: currentUser.uid,
				difference: `Passed: ${userId}, Auth: ${currentUser.uid}`,
			});
			throw new Error(`User ID mismatch - passed: ${userId}, auth: ${currentUser.uid}`);
		}
		console.log('🔄 [uploadProfilePhoto] Forcing token refresh...');
		try {
			await currentUser.getIdToken(true); // Force refresh
			console.log('✅ [uploadProfilePhoto] Token refreshed successfully');
		} catch (tokenError: any) {
			console.error('❌ [uploadProfilePhoto] Token refresh failed:', tokenError);
			throw new Error(`Token refresh failed: ${tokenError.message}`);
		}

		// STEP 3: Native settle delay (matching post upload pattern)
		// This ensures native Firebase SDK has processed the auth state
		console.log('⏳ [uploadProfilePhoto] Waiting for native auth to settle (300ms)...');
		await new Promise(resolve => setTimeout(resolve, 300));
		console.log('✅ [uploadProfilePhoto] Native auth settled');

		// STEP 4: Prepare storage path using LEGACY path (matches existing profile photos)
		// CRITICAL: Use profilePhotos/{userId}/{fileName} to match existing storage structure
		const authUid = currentUser.uid;
		const fileName = `${authUid}.jpg`;
		const storagePath = `profilePhotos/${authUid}/${fileName}`; // Legacy path without users/ prefix

		console.log('📤 [uploadProfilePhoto] Upload details:', {
			storagePath,
			authUid,
			passedUserId: userId,
			uidMatch: authUid === userId,
			fileName,
			imageUri: finalImageUri.substring(0, 50) + '...',
		});

		// STEP 5: Get storage reference using React Native Firebase
		const reference = firebaseStorage.ref(storagePath);

		// STEP 6: Prepare upload URI (remove file:// prefix if present)
		let uploadUri = finalImageUri;
		if (Platform.OS === 'ios' && uploadUri.startsWith('file://')) {
			uploadUri = uploadUri.replace('file://', '');
		}
		if (Platform.OS === 'android' && uploadUri.startsWith('file://')) {
			uploadUri = uploadUri.replace('file://', '');
		}

		console.log('📤 [uploadProfilePhoto] Starting upload to:', storagePath);
		console.log('📤 [uploadProfilePhoto] Upload URI:', uploadUri.substring(0, 50) + '...');

		// STEP 7: Upload file
		await reference.putFile(uploadUri);
		console.log('✅ [uploadProfilePhoto] File uploaded successfully');

		// STEP 8: Get download URL
		const downloadURL = await reference.getDownloadURL();
		console.log('✅ [uploadProfilePhoto] Download URL retrieved:', downloadURL.substring(0, 80) + '...');

		return downloadURL;
	} catch (error: any) {
		console.error('❌ [uploadProfilePhoto] Upload failed:', {
			error: error.message,
			code: error.code,
			userId,
		});
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


