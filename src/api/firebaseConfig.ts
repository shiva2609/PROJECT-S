// Frontend-only build: Firebase disabled. Leaving stubs so imports won’t break if any remain.
// Remove this file when backend is ready, then restore real Firebase implementation.

export type FirestorePost = {
  id?: string;
  userId: string;
  caption: string;
  mediaUrl?: string;
  createdAt: number;
  destination?: string;
};

export async function signInWithEmail(_email: string, _password: string) {
  throw new Error('Firebase is disabled in frontend-only mode');
}

export async function signUpWithEmail(_email: string, _password: string) {
  throw new Error('Firebase is disabled in frontend-only mode');
}

export async function signOut() {
  return;
}

export async function addPost(_data: FirestorePost) {
  throw new Error('Firebase is disabled in frontend-only mode');
}

export async function getTrips(_userId: string) {
  return [] as any[];
}
