// import functions from '@react-native-firebase/functions'; // Native module not installed
import storage from '@react-native-firebase/storage';
import { auth, db } from '../../core/firebase';
import { Story, StoryUser } from '../../types/story';
import { arrayUnion } from 'firebase/firestore';

// Use direct Firestore access to avoid native dependency issues
export const StoryService = {
    async uploadStory(
        mediaUri: string,
        mediaType: 'image' | 'video' | 'text',
        caption: string = ''
    ): Promise<void> {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Not logged in');

            // 1. Upload Media
            const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const ext = mediaType === 'video' ? 'mp4' : 'jpg';
            const ref = storage().ref(`stories/${currentUser.uid}/${filename}.${ext}`);

            await ref.putFile(mediaUri);
            const url = await ref.getDownloadURL();

            // 2. Add to Firestore directly (bypassing Cloud Function)
            const now = Date.now();
            const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

            const storyData = {
                userId: currentUser.uid,
                createdBy: currentUser.uid, // Required by security rules
                mediaUrl: url,
                mediaType,
                caption: caption || '',
                createdAt: now,
                expiresAt,
                views: [],
            };

            await db.collection('stories').add(storyData);

        } catch (e: any) {
            console.error("Upload failed", e);
            if (e.code === 'storage/unauthorized') {
                throw new Error('Permission denied: You cannot upload to this user location. Please check storage rules.');
            }
            if (e.code === 'permission-denied') {
                throw new Error('Permission denied: Firestore write failed.');
            }
            throw e;
        }
    },

    async getStoryFeed(): Promise<StoryUser[]> {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return [];

            const now = Date.now();

            // 1. Query Firestore Directly
            // We use simple filtering to avoid complex index requirements if possible
            // But 'expiresAt > now' is efficient.
            const snapshot = await db.collection('stories')
                .where('expiresAt', '>', now)
                .orderBy('expiresAt', 'desc')
                .get();

            const stories: Story[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));

            // Group by User (Logic identical to before)
            const userMap: Record<string, Story[]> = {};
            stories.forEach(s => {
                if (!userMap[s.userId]) userMap[s.userId] = [];
                userMap[s.userId]!.push(s);
            });

            const feed: StoryUser[] = [];
            const uids = Object.keys(userMap);

            await Promise.all(uids.map(async (uid) => {
                try {
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (!userDoc.exists) return;

                    const userData = userDoc.data();
                    const username = userData?.username || userData?.displayName || 'User';
                    const avatar = userData?.profilePhotoUrl || userData?.profilePhoto || userData?.photoURL || userData?.avatar || '';

                    const userStories = userMap[uid] || [];
                    if (userStories.length === 0) return;

                    userStories.sort((a, b) => a.createdAt - b.createdAt);
                    const hasUnseen = userStories.some((s: Story) => {
                        // Safe check for views array
                        if (!s.views || !Array.isArray(s.views)) return true; // Treat as unseen if views missing
                        return !s.views.includes(currentUser.uid);
                    });

                    feed.push({
                        userId: uid,
                        username,
                        avatar,
                        stories: userStories,
                        hasUnseen
                    });
                } catch (err) {
                    console.error(`Failed to fetch user ${uid}`, err);
                }
            }));

            return feed.sort((a, b) => {
                if (a.userId === currentUser.uid) return -1;
                if (b.userId === currentUser.uid) return 1;
                return (Number(b.hasUnseen) - Number(a.hasUnseen));
            });

        } catch (e) {
            console.error("Feed fetch failed", e);
            return [];
        }
    },

    async viewStory(storyId: string): Promise<void> {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            // Direct update
            // Note: This relies on updated Firestore rules allowing specific 'views' update 
            // by non-owners. If rule update pending, this might fail silently.
            await db.collection('stories').doc(storyId).update({
                views: arrayUnion(currentUser.uid)
            });
        } catch (e: any) {
            // Ignore not-found errors, as they are expected if story is deleted
            if (e.code === 'firestore/not-found' || e.message?.includes('not-found')) {
                return;
            }
            console.error("View update failed", e);
        }
    },
    async deleteStory(storyId: string, mediaUrl: string): Promise<void> {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            // Delete from Firestore
            await db.collection('stories').doc(storyId).delete();

            // Try to delete from storage (optional, best effort)
            try {
                await storage().refFromURL(mediaUrl).delete();
            } catch (storageErr) {
                console.warn("Could not delete from storage", storageErr);
            }

        } catch (e) {
            console.error("Delete story failed", e);
            throw e;
        }
    }
};
