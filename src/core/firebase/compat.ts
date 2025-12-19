import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// ---------- Auth Compat ----------

export function getAuth() {
    return auth();
}

export function onAuthStateChanged(authInstance: any, nextOrObserver: any, error?: any, completed?: any) {
    return authInstance.onAuthStateChanged(nextOrObserver);
}

export function signOut(authInstance: any) {
    return authInstance.signOut();
}

export function signInWithEmailAndPassword(authInstance: any, email: string, pass: string) {
    return authInstance.signInWithEmailAndPassword(email, pass);
}

export function createUserWithEmailAndPassword(authInstance: any, email: string, pass: string) {
    return authInstance.createUserWithEmailAndPassword(email, pass);
}

export function sendPasswordResetEmail(authInstance: any, email: string) {
    return authInstance.sendPasswordResetEmail(email);
}

export function updatePassword(user: any, newPass: string) {
    return user.updatePassword(newPass);
}

export function deleteUser(user: any) {
    return user.delete();
}

export function updateProfile(user: any, profile: any) {
    return user.updateProfile(profile);
}

// ---------- Firestore Compat ----------

export function getFirestore() {
    return firestore();
}

// In Native SDK, doc() can be called on collection or db.
// V9: doc(db, 'users', 'id') or doc(collRef, 'id')
export function doc(parent: any, ...pathSegments: string[]) {
    if (parent.doc) {
        // parent is a collection
        if (pathSegments.length === 1) return parent.doc(pathSegments[0]);
        // path segments joined
        return parent.doc(pathSegments.join('/'));
    }
    // parent is db
    const path = pathSegments.join('/');
    return parent.collection(path.split('/')[0]).doc(path.split('/').slice(1).join('/'));
}

export function collection(parent: any, path: string, ...rest: string[]) {
    // Handle collection(db, 'users') or collection(docRef, 'subcol')
    const fullPath = [path, ...rest].join('/');
    return parent.collection(fullPath);
}

// Methods

export function getDoc(ref: any) {
    return ref.get();
}

export function getDocs(query: any) {
    return query.get();
}

export function setDoc(ref: any, data: any, options?: any) {
    return ref.set(data, options);
}

export function updateDoc(ref: any, data: any) {
    return ref.update(data);
}

export function deleteDoc(ref: any) {
    return ref.delete();
}

export function addDoc(collectionRef: any, data: any) {
    return collectionRef.add(data);
}

export function onSnapshot(query: any, ...args: any[]) {
    // args can be (next, error) or (observer)
    if (typeof args[0] === 'function') {
        return query.onSnapshot(args[0], args[1]);
    }
    return query.onSnapshot(args[0]);
}

// Query Construction

export function query(query: any, ...constraints: any[]) {
    let q = query;
    for (const c of constraints) {
        if (typeof c === 'function') {
            q = c(q);
        }
    }
    return q;
}

export function where(field: string, op: any, value: any) {
    return (q: any) => q.where(field, op, value);
}

export function orderBy(field: string, dir?: 'asc' | 'desc') {
    return (q: any) => q.orderBy(field, dir);
}

export function limit(n: number) {
    return (q: any) => q.limit(n);
}

export function startAfter(docOrVal: any) {
    return (q: any) => q.startAfter(docOrVal);
}

export function startAt(docOrVal: any) {
    return (q: any) => q.startAt(docOrVal);
}

export function endAt(docOrVal: any) {
    return (q: any) => q.endAt(docOrVal);
}

export function endBefore(docOrVal: any) {
    return (q: any) => q.endBefore(docOrVal);
}

export function getCountFromServer(query: any) {
    if (query.count) {
        return query.count().get();
    }
    return query.get().then((snap: any) => ({
        data: () => ({ count: snap.size })
    }));
}

// Field Values

export function serverTimestamp() {
    return firestore.FieldValue.serverTimestamp();
}

export function increment(n: number) {
    return firestore.FieldValue.increment(n);
}

export function arrayUnion(...elements: any[]) {
    return firestore.FieldValue.arrayUnion(...elements);
}

export function arrayRemove(...elements: any[]) {
    return firestore.FieldValue.arrayRemove(...elements);
}

export function deleteField() {
    return firestore.FieldValue.delete();
}

// Batch / Transaction

export function writeBatch(db: any) {
    return db.batch();
}

export function runTransaction(db: any, updateFunction: (transaction: any) => Promise<any>) {
    return db.runTransaction(updateFunction);
}

export function enableNetwork(db: any) {
    return db.enableNetwork();
}

export function disableNetwork(db: any) {
    return db.disableNetwork();
}

export const Timestamp = firestore.Timestamp;


// ---------- Storage Compat ----------

export function getStorage() {
    return storage();
}

export function ref(storageInstance: any, path: string) {
    // storageInstance is ignored in native if we use default app, but we should respect it if possible.
    // Native: storage().ref(path)
    return storageInstance.ref(path);
}

export function uploadBytes(ref: any, data: Blob | Uint8Array | ArrayBuffer) {
    // Native supports putFile (path) or put (blob/data)
    // Converting Web Blob to something Native understands might be tricky if data is literally a JS Blob.
    // But usually in RN we use file paths.
    // If data is Blob, native might handle it if polyfilled.
    // Let's assume data is standard specific to the codebase usage.
    return ref.put(data);
}

export function uploadBytesResumable(ref: any, data: any, metadata?: any) {
    return ref.put(data, metadata);
}

export function getDownloadURL(ref: any) {
    return ref.getDownloadURL();
}

// ---------- Types ----------
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ... (existing helper types can refer to FirebaseFirestoreTypes if desired)
export type User = any;
export type DocumentSnapshot<T extends DocumentData = DocumentData> = FirebaseFirestoreTypes.DocumentSnapshot<T>;
export type QuerySnapshot<T extends DocumentData = DocumentData> = FirebaseFirestoreTypes.QuerySnapshot<T>;
export type DocumentData = FirebaseFirestoreTypes.DocumentData;
export type Query<T extends DocumentData = DocumentData> = FirebaseFirestoreTypes.Query<T>;
export type CollectionReference<T extends DocumentData = DocumentData> = FirebaseFirestoreTypes.CollectionReference<T>;
export type DocumentReference<T extends DocumentData = DocumentData> = FirebaseFirestoreTypes.DocumentReference<T>;
export type QueryDocumentSnapshot<T extends DocumentData = DocumentData> = FirebaseFirestoreTypes.QueryDocumentSnapshot<T>;
export type Unsubscribe = () => void;
export type Timestamp = FirebaseFirestoreTypes.Timestamp;
