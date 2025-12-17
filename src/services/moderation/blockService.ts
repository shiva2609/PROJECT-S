/**
 * Block Service
 * V1 MODERATION: Centralized block/unblock functionality
 */

import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from '../../core/firebase/compat';
import { db } from '../../core/firebase';

/**
 * Block a user
 * Adds userId to current user's blockedUsers array
 * Also handled by firebaseService.blockUser (which also removes follow)
 */
export async function blockUser(currentUserId: string, blockedUserId: string): Promise<void> {
    if (!currentUserId || !blockedUserId) {
        throw new Error('Current user ID and blocked user ID are required');
    }

    if (currentUserId === blockedUserId) {
        throw new Error('Cannot block yourself');
    }

    try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            blockedUsers: arrayUnion(blockedUserId),
        });
        console.log('✅ User blocked successfully');
    } catch (error: any) {
        console.error('❌ Error blocking user:', error);
        throw error;
    }
}

/**
 * Unblock a user
 * Removes userId from current user's blockedUsers array
 */
export async function unblockUser(currentUserId: string, unblockedUserId: string): Promise<void> {
    if (!currentUserId || !unblockedUserId) {
        throw new Error('Current user ID and unblocked user ID are required');
    }

    try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            blockedUsers: arrayRemove(unblockedUserId),
        });
        console.log('✅ User unblocked successfully');
    } catch (error: any) {
        console.error('❌ Error unblocking user:', error);
        throw error;
    }
}

/**
 * Get blocked users list
 * Returns array of blocked user IDs
 */
export async function getBlockedUsers(currentUserId: string): Promise<string[]> {
    if (!currentUserId) {
        return [];
    }

    try {
        const userRef = doc(db, 'users', currentUserId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return [];
        }

        const data = userSnap.data();
        return data.blockedUsers || [];
    } catch (error: any) {
        console.error('❌ Error getting blocked users:', error);
        return [];
    }
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
    if (!currentUserId || !targetUserId) {
        return false;
    }

    try {
        const blockedUsers = await getBlockedUsers(currentUserId);
        return blockedUsers.includes(targetUserId);
    } catch (error: any) {
        console.error('❌ Error checking if user is blocked:', error);
        return false;
    }
}

/**
 * Filter out posts from blocked users
 * V1 MODERATION: Global filter to apply across all feeds
 */
export function filterBlockedPosts<T extends { userId?: string; authorId?: string; createdBy?: string; ownerId?: string }>(
    posts: T[],
    blockedUsers: string[]
): T[] {
    if (!blockedUsers || blockedUsers.length === 0) {
        return posts;
    }

    return posts.filter(post => {
        // Check all possible user ID fields
        const postUserId = post.userId || post.authorId || post.createdBy || post.ownerId;
        return postUserId && !blockedUsers.includes(postUserId);
    });
}
