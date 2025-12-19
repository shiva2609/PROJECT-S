import { useState, useEffect } from 'react';
import { listenToSavedPosts, getSavedPosts } from '../global/services/posts/post.interactions.service';
import { getPostsByIds, PostWithAuthor } from '../global/services/posts/post.service';
import { useAuth } from '../providers/AuthProvider';

/**
 * Hook to fetch and listen to the current user's saved posts.
 * Returns fully populated Post objects, sorted by saved date (newest first).
 */
export function useSavedPostsList(userId?: string) {
    const { user: authUser } = useAuth();
    const targetUserId = userId || authUser?.uid;

    const [posts, setPosts] = useState<PostWithAuthor[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!targetUserId) {
            setPosts([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const unsubscribe = listenToSavedPosts(targetUserId, async (postIds) => {
            try {
                if (postIds.length === 0) {
                    setPosts([]);
                    setLoading(false);
                    return;
                }

                // 1. Fetch full post data
                const fetchedPosts = await getPostsByIds(postIds);

                // 2. Fetch saved timestamps for sorting
                // Note: getSavedPosts returns { postId, savedAt }
                const savedMetaData = await getSavedPosts(targetUserId);
                const savedAtMap = new Map(savedMetaData.map(sp => [sp.postId, sp.savedAt]));

                // 3. Sort by savedAt (descending)
                const sortedPosts = fetchedPosts.sort((a, b) => {
                    const aSavedAt = savedAtMap.get(a.id);
                    const bSavedAt = savedAtMap.get(b.id);

                    const aTime = aSavedAt?.toMillis?.() || (aSavedAt as any)?.seconds * 1000 || 0;
                    const bTime = bSavedAt?.toMillis?.() || (bSavedAt as any)?.seconds * 1000 || 0;

                    return bTime - aTime;
                });

                // 4. Enrich with interaction state (crucial for consistency)
                // Since these ARE saved posts, isSaved is true for the current user (if target==current)
                // gracefully handle viewing others' saved posts (if privacy allows, but for now assuming own)
                const enrichedPosts = sortedPosts.map(p => ({
                    ...p,
                    isSaved: true, // By definition
                    // We might want to fetch isLiked status too if we want perfect consistency
                    // But getPostsByIds doesn't do that by default.
                    // PostCard will handle its own listener, so strictly strictly speaking we don't need it here
                    // unless we want to avoid initial flicker.
                }));

                setPosts(enrichedPosts);
            } catch (err: any) {
                console.error('[useSavedPostsList] Error fetching saved posts:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [targetUserId]);

    return { posts, loading, error };
}
