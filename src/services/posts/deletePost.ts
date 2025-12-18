/**
 * Post Deletion Service
 * 
 * SINGLE SOURCE OF TRUTH for post deletion
 * Deletes post from Firestore AND Firebase Storage
 * 
 * CRITICAL: This is the ONLY place where posts should be deleted
 */

import { doc, getDoc, deleteDoc, updateDoc, increment } from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

/**
 * Delete a post completely
 * 
 * @param postId - Post document ID
 * @param ownerId - Post owner user ID (for authorization)
 * 
 * Steps:
 * 1. Verify authorization (current user must be post owner)
 * 2. Fetch post data to get media information
 * 3. Delete all media files from Firebase Storage
 * 4. Delete Firestore post document
 * 5. Decrement user's postsCount
 * 
 * @throws Error if unauthorized or post not found
 */
export async function deletePost(postId: string, ownerId: string): Promise<void> {
    const currentUser = auth().currentUser;

    // STEP 1: Authorization check
    if (!currentUser) {
        throw new Error('UNAUTHORIZED_DELETE: User not authenticated');
    }

    if (currentUser.uid !== ownerId) {
        throw new Error('UNAUTHORIZED_DELETE: You can only delete your own posts');
    }

    console.log(`🗑️ [deletePost] Starting deletion for post: ${postId}`);

    try {
        // STEP 2: Fetch post data
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
            console.warn(`⚠️ [deletePost] Post ${postId} not found, may already be deleted`);
            return; // Already deleted, no error
        }

        const postData = postSnap.data();
        console.log(`📄 [deletePost] Post data fetched:`, {
            mediaUrls: postData?.mediaUrls?.length || 0,
            media: postData?.media?.length || 0,
        });

        // DEBUG: Log full post data structure
        console.log('🔍 [DEBUG] Full post data:', JSON.stringify({
            id: postId,
            mediaUrls: postData?.mediaUrls,
            imageUrl: postData?.imageUrl,
            finalCroppedUrl: postData?.finalCroppedUrl,
            media: postData?.media,
        }, null, 2));

        // STEP 3: Delete all media from Firebase Storage
        const mediaToDelete: Array<{ url?: string; storagePath?: string }> = [];

        // Collect media from various fields
        // Priority 1: media array with storagePath (new posts)
        if (postData?.media && Array.isArray(postData.media)) {
            postData.media.forEach((item: any) => {
                if (item.storagePath) {
                    // New format: has storagePath metadata
                    mediaToDelete.push({ storagePath: item.storagePath, url: item.url || item.uri });
                } else if (item.url || item.uri) {
                    // Legacy format: only has URL
                    mediaToDelete.push({ url: item.url || item.uri });
                }
            });
        }

        // Priority 2: mediaUrls array (legacy)
        if (postData?.mediaUrls && Array.isArray(postData.mediaUrls)) {
            postData.mediaUrls.forEach((url: string) => {
                if (!mediaToDelete.some(m => m.url === url)) {
                    mediaToDelete.push({ url });
                }
            });
        }

        // Priority 3: Single image fields (legacy)
        const singleImageFields = ['imageUrl', 'finalCroppedUrl'];
        singleImageFields.forEach(field => {
            const url = postData?.[field];
            if (url && !mediaToDelete.some(m => m.url === url)) {
                mediaToDelete.push({ url });
            }
        });

        console.log(`🗑️ [deletePost] Found ${mediaToDelete.length} media files to delete`);

        // DEBUG: Log what we're about to delete
        console.log('🔍 [DEBUG] Media to delete:', JSON.stringify(mediaToDelete, null, 2));

        // Delete each media file
        const deleteResults = await Promise.allSettled(
            mediaToDelete.map(async (item) => {
                try {
                    let storagePath: string | null = null;

                    // Method 1: Use storagePath metadata (preferred)
                    if (item.storagePath) {
                        storagePath = item.storagePath;
                        console.log(`🗑️ [deletePost] Using storagePath metadata: ${storagePath}`);
                    }
                    // Method 2: Extract from URL (fallback for legacy posts)
                    else if (item.url && item.url.includes('firebasestorage')) {
                        const urlObj = new URL(item.url);
                        const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);

                        if (pathMatch && pathMatch[1]) {
                            const encodedPath = pathMatch[1];
                            storagePath = decodeURIComponent(encodedPath);
                            console.log(`🗑️ [deletePost] Extracted path from URL: ${storagePath}`);
                        }
                    }

                    if (!storagePath) {
                        console.log(`⏭️ [deletePost] Skipping - no storage path available for: ${item.url?.substring(0, 50)}...`);
                        return;
                    }

                    // Delete from storage
                    const storageRef = storage().ref(storagePath);
                    await storageRef.delete();

                    console.log(`✅ [deletePost] Deleted: ${storagePath}`);
                } catch (storageError: any) {
                    // Log but don't fail - file might already be deleted
                    if (storageError.code === 'storage/object-not-found') {
                        console.log(`ℹ️ [deletePost] File already deleted`);
                    } else {
                        console.warn(`⚠️ [deletePost] Could not delete media:`, {
                            storagePath: item.storagePath,
                            url: item.url?.substring(0, 50),
                            error: storageError.message,
                            code: storageError.code,
                        });
                    }
                }
            })
        );

        // Log deletion summary
        const successCount = deleteResults.filter(r => r.status === 'fulfilled').length;
        const failCount = deleteResults.filter(r => r.status === 'rejected').length;
        console.log(`📊 [deletePost] Storage deletion complete: ${successCount} succeeded, ${failCount} failed`);

        // STEP 4: Delete Firestore document
        await deleteDoc(postRef);
        console.log(`✅ [deletePost] Firestore document deleted: ${postId}`);

        // STEP 5: Decrement user's postsCount
        try {
            const userRef = doc(db, 'users', ownerId);
            await updateDoc(userRef, {
                postsCount: increment(-1),
            });
            console.log(`✅ [deletePost] Decremented postsCount for user: ${ownerId}`);
        } catch (countError: any) {
            // Don't fail the entire operation if count update fails
            console.warn(`⚠️ [deletePost] Could not decrement postsCount:`, countError.message);
        }

        console.log(`✅ [deletePost] Post ${postId} deleted successfully`);
    } catch (error: any) {
        console.error(`❌ [deletePost] Error deleting post ${postId}:`, error);
        throw error;
    }
}
