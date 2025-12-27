import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore'; // Native SDK
import { auth, db } from '../../core/firebase';
import { Story, StoryUser } from '../../types/story';

/**
 * 🟡 V1 SAFE STORY SERVICE (Native Firestore)
 * 
 * Architecture:
 * - Read: Direct query to 'stories' (Global Feed for V1)
 * - Write: Direct upload + Firestore 'stories'
 * - Tracking: Append-only 'story_views' collection
 * - Scaling: Strict limit(50) and no unbounded arrays
 */

// Internal type for the raw Firestore document (Lean Schema)
interface StoryDoc {
    id: string;
    authorId: string;
    mediaRef: string; // Storage path
    mediaUrl: string; // Public/Signed URL
    mediaType: 'image' | 'video' | 'text';
    caption?: string;
    createdAt: number;
    expiresAt: number;
    status: 'processing' | 'ready';
    // NO embedded views array
}

// Simple in-memory cache for user profiles (TTL 5 mins)
// Maps userId -> { username, avatar, timestamp }
const userProfileCache = new Map<string, { username: string, avatar: string, timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const StoryService = {

    /**
     * 🟢 UPLOAD: Direct to Storage V1 path, then Stories collection
     */
    async uploadStory(
        mediaUri: string,
        mediaType: 'image' | 'video' | 'text',
        caption: string = ''
    ): Promise<void> {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Not logged in');

        // 1. Upload to partitioned V1 storage path
        const storyId = db.collection('stories').doc().id;
        const ext = mediaType === 'video' ? 'mp4' : 'jpg';
        const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        // Path: stories/v1/{userId}/{storyId}/{filename} (Matches Rules)
        const storagePath = `stories/v1/${currentUser.uid}/${storyId}/${filename}`;

        const ref = storage().ref(storagePath);
        await ref.putFile(mediaUri);
        const mediaUrl = await ref.getDownloadURL();

        // 2. Write to Firestore (Lean Schema)
        const now = Date.now();
        const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

        const storyData: Omit<StoryDoc, 'id'> = {
            authorId: currentUser.uid,
            mediaRef: storagePath,
            mediaUrl,
            mediaType,
            caption: caption || '',
            createdAt: now,
            expiresAt,
            status: 'ready'
        };

        // Use the pre-generated ID
        await db.collection('stories').doc(storyId).set(storyData);
    },

    /**
     * 🟢 FEED: Pagination + Grouping + Read-Side Join
     * Strategies:
     * 1. Fetch recent stories (Limit 50)
     * 2. Batch fetch View Status
     * 3. Batch fetch User Models (with caching)
     */
    async getStoryFeed(): Promise<StoryUser[]> {
        const currentUser = auth.currentUser;
        if (!currentUser) return [];

        try {
            const now = Date.now();

            // 1. Query strictly limited active stories
            const snapshot = await db.collection('stories')
                .where('expiresAt', '>', now)
                .orderBy('expiresAt', 'desc')
                .limit(50)
                .get();

            if (snapshot.empty) return [];

            const rawStories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as StoryDoc));

            // 2. Batch Fetch View Status (What have I seen?)
            const myViewsSnap = await db.collection('story_views')
                .where('viewerId', '==', currentUser.uid)
                .where('seenAt', '>', now - 24 * 60 * 60 * 1000)
                .get();

            const myViewedStoryIds = new Set(myViewsSnap.docs.map(d => d.data().storyId));

            // 3. Identification of Authors needed
            const authorIds = new Set(rawStories.map(s => s.authorId));
            // Filter out self (handled via Auth) and cached users
            const idsToFetch = Array.from(authorIds).filter(uid => {
                if (!uid || typeof uid !== 'string' || uid.trim() === '') return false;
                if (uid === currentUser.uid) return false;
                const cached = userProfileCache.get(uid);
                if (cached && (now - cached.timestamp < CACHE_TTL_MS)) return false;
                return true;
            });

            // 4. Batch Fetch User Profiles (Read-Side Join)
            if (idsToFetch.length > 0) {
                // Chunk into 10s for 'IN' query limit
                const chunks = [];
                for (let i = 0; i < idsToFetch.length; i += 10) {
                    const chunk = idsToFetch.slice(i, i + 10);
                    if (chunk && chunk.length > 0) chunks.push(chunk);
                }

                await Promise.all(chunks.map(async (chunk) => {
                    if (!chunk || chunk.length === 0) return;
                    try {
                        const userSnap = await db.collection('users')
                            .where(firestore.FieldPath.documentId(), 'in', chunk)
                            .get();

                        userSnap.docs.forEach(doc => {
                            const data = doc.data();
                            userProfileCache.set(doc.id, {
                                username: data.username || data.displayName || 'User',
                                avatar: data.profilePhotoUrl || data.profilePhoto || data.photoURL || '',
                                timestamp: Date.now()
                            });
                        });
                    } catch (e) {
                        console.warn('User batch fetch failed', e);
                    }
                }));
            }

            // 5. Construct Feed
            const userMap: Record<string, Story[]> = {};

            rawStories.forEach(doc => {
                if (!doc.authorId) return;
                const viewsInjection = myViewedStoryIds.has(doc.id) ? [currentUser.uid] : [];
                const uiStory: Story = {
                    id: doc.id,
                    userId: doc.authorId,
                    mediaUrl: doc.mediaUrl,
                    mediaType: doc.mediaType,
                    caption: doc.caption,
                    createdAt: doc.createdAt,
                    expiresAt: doc.expiresAt,
                    views: viewsInjection
                };

                if (!userMap[doc.authorId]) userMap[doc.authorId] = [];
                userMap[doc.authorId].push(uiStory);
            });

            // Re-generate authorIds from the validated map keys to ensure consistency
            const validAuthorIds = Object.keys(userMap);
            const feed: StoryUser[] = [];

            validAuthorIds.forEach(uid => {
                const stories = userMap[uid];
                if (!stories || stories.length === 0) return;

                stories.sort((a, b) => a.createdAt - b.createdAt);
                // Re-calculate hasUnseen
                const hasUnseen = stories.some(s => !s.views || !s.views.includes(currentUser.uid));

                // Resolve User Data
                let username = 'User';
                let avatar = '';

                if (uid === currentUser.uid) {
                    username = currentUser.displayName || 'Me';
                    avatar = currentUser.photoURL || '';
                    feed.push({
                        userId: uid,
                        username: 'Your Story', // Force 'Your Story' label for self usually handled by UI but good to be explicit
                        avatar,
                        stories,
                        hasUnseen: false // Self stories are seen
                    });
                } else {
                    const profile = userProfileCache.get(uid);
                    if (profile) {
                        username = profile.username;
                        avatar = profile.avatar;
                    }

                    feed.push({
                        userId: uid,
                        username,
                        avatar,
                        stories,
                        hasUnseen
                    });
                }
            });

            // Sort: My story first? Or Unseen first?
            // Usually My Story is separated by UI. The feed request returns "others".
            // StoryFeed.tsx:34 filters out current user. So we rely on that.

            return feed.sort((a, b) => {
                if (a.userId === currentUser.uid) return -1;
                if (b.userId === currentUser.uid) return 1;
                if (a.hasUnseen && !b.hasUnseen) return -1;
                if (!a.hasUnseen && b.hasUnseen) return 1;
                return 0;
            });

        } catch (e) {
            console.error("Feed Error", e);
            return [];
        }
    },

    /**
     * 🟢 VIEW: Append-only write
     */
    async viewStory(storyId: string): Promise<void> {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        try {
            const viewId = `${storyId}_${currentUser.uid}`;
            await db.collection('story_views').doc(viewId).set({
                storyId,
                viewerId: currentUser.uid,
                seenAt: Date.now()
            });
        } catch (e) {
            console.warn("View tracking failed", e);
        }
    },

    async cleanupExpiredStories(): Promise<void> {
        console.log("Cleanup managed by backend policies");
    },

    async deleteStory(storyId: string, mediaUrl: string): Promise<void> {
        try {
            await db.collection('stories').doc(storyId).delete();
            const ref = storage().refFromURL(mediaUrl);
            await ref.delete().catch(() => { });
        } catch (e) {
            console.error("Delete failed", e);
        }
    }
};
