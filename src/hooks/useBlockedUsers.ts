/**
 * useBlockedUsers Hook
 * V1 MODERATION: Manages blocked users state and filtering
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/auth/authService'; // Correct path to db
import { unblockUser as unblockUserService } from '../services/moderation/blockService';

export function useBlockedUsers(currentUserId: string | undefined) {
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Listen to blocked users in real-time
    useEffect(() => {
        if (!currentUserId) {
            setBlockedUsers([]);
            setLoading(false);
            return;
        }

        const userRef = doc(db, 'users', currentUserId);

        const unsubscribe = onSnapshot(
            userRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setBlockedUsers(data.blockedUsers || []);
                } else {
                    setBlockedUsers([]);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error listening to blocked users:', error);
                setBlockedUsers([]);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUserId]);

    // Unblock a user
    const unblockUser = useCallback(async (unblockedUserId: string) => {
        if (!currentUserId) {
            throw new Error('No current user');
        }

        try {
            await unblockUserService(currentUserId, unblockedUserId);
            // State will update via listener
        } catch (error) {
            console.error('Error unblocking user:', error);
            throw error;
        }
    }, [currentUserId]);

    // Check if a user is blocked
    const isBlocked = useCallback((userId: string) => {
        return blockedUsers.includes(userId);
    }, [blockedUsers]);

    // Filter posts from blocked users
    const filterPosts = useCallback(<T extends { userId?: string; authorId?: string; createdBy?: string; ownerId?: string }>(
        posts: T[]
    ): T[] => {
        if (blockedUsers.length === 0) {
            return posts;
        }

        return posts.filter(post => {
            const postUserId = post.userId || post.authorId || post.createdBy || post.ownerId;
            return postUserId && !blockedUsers.includes(postUserId);
        });
    }, [blockedUsers]);

    return {
        blockedUsers,
        loading,
        unblockUser,
        isBlocked,
        filterPosts,
    };
}
