import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize admin if not already initialized (it usually is in index.ts, but safe to check or assume handled)
// Since we are exporting functions to be used in index.ts where admin.initializeApp is called, we can use admin.firestore() directly.

interface StoryData {
    userId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video' | 'text';
    caption?: string;
    createdAt: number;
    expiresAt: number;
    views: string[];
}

export const uploadStory = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { mediaUrl, mediaType, caption } = data;
    if (!mediaUrl || !mediaType) {
        throw new functions.https.HttpsError('invalid-argument', 'Media URL and type are required.');
    }

    const uid = context.auth.uid;
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    const story: StoryData = {
        userId: uid,
        mediaUrl,
        mediaType,
        caption: caption || '',
        createdAt: now,
        expiresAt,
        views: [],
    };

    try {
        const ref = await admin.firestore().collection('stories').add(story);
        return { id: ref.id, ...story };
    } catch (error) {
        console.error('Error uploading story:', error);
        throw new functions.https.HttpsError('internal', 'Failed to upload story.');
    }
});

export const getStoryFeed = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const now = Date.now();

    try {
        // Get visible stories (not expired)
        // Note: In a real app, you'd filter by followed users. 
        // For this patch, we fetch global recent stories or strictly followed ones if available.
        // Let's rely on client-side grouping or return a list.
        // Querying all recently active stories:
        const snapshot = await admin.firestore()
            .collection('stories')
            .where('expiresAt', '>', now)
            .orderBy('expiresAt', 'desc') // effective equivalent to filtering by created time window
            .limit(100)
            .get();

        const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // In a real refined implementation, we would fetch user profiles here or let the client do it.
        // Let's just return the raw stories logic.
        return { stories };
    } catch (error) {
        console.error('Error fetching stories:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch stories.');
    }
});

export const viewStory = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { storyId } = data;
    if (!storyId) return;

    const uid = context.auth.uid;
    try {
        await admin.firestore().collection('stories').doc(storyId).update({
            views: admin.firestore.FieldValue.arrayUnion(uid)
        });
        return { success: true };
    } catch (error) {
        console.error('Error viewing story:', error);
        // Be lenient with view errors
        return { success: false };
    }
});

// Scheduled function to run every hour
export const cleanupExpiredStories = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
    const now = Date.now();
    const snapshot = await admin.firestore()
        .collection('stories')
        .where('expiresAt', '<', now)
        .get();

    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} expired stories.`);
    return null;
});
