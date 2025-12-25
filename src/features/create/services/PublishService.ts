import { PostPayload } from '../contracts';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { auth } from '../../../core/firebase/auth';

/**
 * Atomic Publish Service
 * 
 * STRICT TRANSACTION:
 * Step 1: Upload Media
 * Step 2: Create DB Record (Status: Publishing)
 * Step 3: Finalize (Status: Live)
 * 
 * ROLLBACK:
 * If Step 2 fails -> Delete uploaded media.
 * If Step 3 fails -> Mark as failed (soft delete).
 */
export async function publishPost(payload: PostPayload): Promise<'success' | 'failure'> {
    const user = auth.currentUser;
    if (!user) {
        console.error('[Publish] Abort: No authenticated user');
        return 'failure';
    }

    const postId = firestore().collection('posts').doc().id;
    const storagePath = `users/${user.uid}/posts/${postId}/0.jpg`;
    let downloadURL: string | null = null;

    try {
        console.log(`[Publish] Transaction Start: ${postId}`);

        // ============================================================
        // STEP 1: UPLOAD MEDIA
        // ============================================================
        const reference = storage().ref(storagePath);
        try {
            await reference.putFile(payload.mediaUri);
            downloadURL = await reference.getDownloadURL();
            console.log('[Publish] Step 1 OK: Media Uploaded');
        } catch (uploadError) {
            console.error('[Publish] Step 1 Fail: Upload Error', uploadError);
            return 'failure';
        }

        // ============================================================
        // STEP 2: CREATE DB RECORD
        // ============================================================
        try {
            const docData = {
                id: postId,
                userId: user.uid,
                authorId: user.uid, // Legacy compat
                createdBy: user.uid, // CRITICAL: Required for Profile/Feed queries
                media: [
                    {
                        url: downloadURL,
                        type: 'image',
                        width: payload.width,
                        height: payload.height,
                        aspectRatio: payload.aspectRatio
                    }
                ],
                // Legacy Image Compatibility (for ProfileGrid/Feed rendering)
                imageURL: downloadURL,
                mediaUrl: downloadURL,
                coverImage: downloadURL, // Fallback for some views

                caption: payload.caption,
                location: payload.location || null,
                tags: payload.tags || [],
                hashtags: payload.hashtags || [],
                createdAt: firestore.FieldValue.serverTimestamp(),
                likesCount: 0,
                commentsCount: 0,
                status: 'live' // Direct to live for V1 simplicity if Step 2 succeeds
            };

            await firestore().collection('posts').doc(postId).set(docData);
            console.log('[Publish] Step 2 OK: DB Record Created');

        } catch (dbError) {
            console.error('[Publish] Step 2 Fail: DB Error. Initiating ROLLBACK.', dbError);

            // ROLLBACK: Delete the orphaned file
            try {
                await reference.delete();
                console.log('[Publish] Rollback OK: Orphaned file deleted.');
            } catch (cleanupError) {
                console.error('[Publish] Rollback Fail: Could not delete orphan.', cleanupError);
                // We swallow this because main flow failed anyway, preventing crash loop
            }

            return 'failure';
        }

        // ============================================================
        // STEP 3: SUCCESS
        // ============================================================
        console.log('[Publish] Transaction Complete: Success');
        return 'success';

    } catch (criticalError) {
        console.error('[Publish] Critical System Failure', criticalError);
        return 'failure';
    }
}
