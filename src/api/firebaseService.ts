import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
	getAuth,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	updateProfile,
	User as FirebaseUser,
} from 'firebase/auth';
import {
    initializeFirestore,
    enableNetwork,
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
    Firestore,
} from 'firebase/firestore';
import {
	getStorage,
	ref as storageRef,
	uploadBytes,
	getDownloadURL,
} from 'firebase/storage';

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
	username: string;
	imageUrl: string;
	caption?: string;
	likeCount: number;
	commentCount: number;
	createdAt: number;
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

// ---------- Firebase Bootstrap ----------

const firebaseConfig = {
	apiKey: "AIzaSyCxjt5nfPlD6GwKpP3799rLefn7MrucFOQ",
    authDomain: "sanchari-truetraveller.firebaseapp.com",
    projectId: "sanchari-truetraveller",
    storageBucket: "sanchari-truetraveller.firebasestorage.app",
    messagingSenderId: "893206677174",
    appId: "1:893206677174:web:91d611d0643d1a9f5f8817",
    measurementId: "G-5N4YWHGJSL"
};

const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const authInstance = getAuth(app);
const dbInstance: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});


(async () => {
  try {
    await enableNetwork(dbInstance);
    console.log("✅ Firestore network enabled");
  } catch (e: any) {
    console.log("⚠️ Firestore enableNetwork failed:", e?.message || e);
  }
})();

const storageInstance = getStorage(app);

function auth() {
    return authInstance;
}

function db() {
    return dbInstance;
}

function storage() {
    return storageInstance;
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
	const cred = await createUserWithEmailAndPassword(auth(), email, password);
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
	const cred = await signInWithEmailAndPassword(auth(), email, password);
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

// ---------- Storage ----------

export async function uploadImageAsync(params: { uri: string; path: string }): Promise<string> {
	const { uri, path } = params;
	// In React Native, fetch the file and upload as blob
	const res = await fetch(uri);
	const blob = await res.blob();
    const r = storageRef(storage(), path);
    await uploadBytes(r, blob);
    return await getDownloadURL(r);
}

// ---------- Posts ----------

export async function createPost(params: {
	userId: string;
	username: string;
	imageUrl: string;
	caption?: string;
}): Promise<Post> {
	const base = {
		userId: params.userId,
		username: params.username,
		imageUrl: params.imageUrl,
		caption: params.caption ?? '',
		likeCount: 0,
		commentCount: 0,
		createdAt: nowMs(),
	};
    const ref = await withRetry(() => addDoc(collection(db(), 'posts'), base));
	return { id: ref.id, ...base } as Post;
}

export function listenToFeed(onUpdate: (posts: Post[]) => void): () => void {
	const q = query(collection(db(), 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
		const posts: Post[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
		onUpdate(posts);
    }, (error) => {
        console.log('listenToFeed error:', error?.message || error);
    });
}

export async function likePost(postId: string): Promise<void> {
	const ref = doc(db(), 'posts', postId);
	// Lightweight: rely on Firestore increment via security rules/Cloud Functions if added later
    const snap = await withRetry(() => getDoc(ref));
	if (!snap.exists()) return;
	const data = snap.data() as Post;
    await withRetry(() => updateDoc(ref, { likeCount: (data.likeCount || 0) + 1 }));
}

export async function unlikePost(postId: string): Promise<void> {
	const ref = doc(db(), 'posts', postId);
    const snap = await withRetry(() => getDoc(ref));
	if (!snap.exists()) return;
	const data = snap.data() as Post;
    await withRetry(() => updateDoc(ref, { likeCount: Math.max(0, (data.likeCount || 0) - 1) }));
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
	// Update commentCount naively
	const postRef = doc(db(), 'posts', params.postId);
    const snap = await withRetry(() => getDoc(postRef));
	if (snap.exists()) {
		const data = snap.data() as Post;
        await withRetry(() => updateDoc(postRef, { commentCount: (data.commentCount || 0) + 1 }));
	}
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
	const user = auth().currentUser;
	if (!user) return null;
    const snap = await withRetry(() => getDoc(doc(db(), 'users', user.uid)));
	return snap.exists() ? (snap.data() as UserProfile) : null;
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
                try { await enableNetwork(dbInstance); } catch {}
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
        await enableNetwork(dbInstance);
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


