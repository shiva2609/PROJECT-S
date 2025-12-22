/**
 * REFRESH CONTRACT HARDENING
 * 
 * 🔐 NON-NEGOTIABLE INVARIANTS:
 * 1. No screen should require navigation switching to refresh
 * 2. Every list/feed must support manual + programmatic refresh
 * 3. Refresh behavior must be consistent across all entry points
 * 4. Lifecycle events must not corrupt or duplicate state
 * 5. Network failure must be survivable, not fatal
 * 
 * This module provides:
 * - Canonical refresh controller hook
 * - Standard refresh interface for all data-driven screens
 * - Idempotent refresh (multiple triggers ≠ multiple fetches)
 * - Network failure handling with retry
 * - Lifecycle-safe refresh management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Standard refresh interface that ALL data-driven screens must follow
 */
export interface RefreshContract<T = any> {
    /** Initial data load (called once on mount) */
    fetchInitial: () => Promise<T>;

    /** Manual refresh (pull-to-refresh / forced reload) */
    refresh: () => Promise<T>;

    /** Pagination (if applicable) */
    loadMore?: () => Promise<T>;
}

/**
 * Refresh controller state
 */
export interface RefreshState {
    /** Initial loading state (first load) */
    loading: boolean;

    /** Pull-to-refresh loading state */
    refreshing: boolean;

    /** Pagination loading state */
    loadingMore: boolean;

    /** Error state */
    error: Error | null;

    /** Last successful refresh timestamp */
    lastRefreshTime: number | null;
}

/**
 * Refresh controller options
 */
export interface RefreshControllerOptions {
    /** Auto-refresh on app foreground (default: true) */
    refreshOnForeground?: boolean;

    /** Minimum time between refreshes in ms (default: 1000) */
    minRefreshInterval?: number;

    /** Enable automatic retry on network failure (default: false) */
    autoRetry?: boolean;

    /** Maximum retry attempts (default: 3) */
    maxRetries?: number;

    /** Retry delay in ms (default: 2000) */
    retryDelay?: number;

    /** Enable debug logging (default: __DEV__) */
    debug?: boolean;
}

/**
 * 🔐 CANONICAL REFRESH CONTROLLER HOOK
 * 
 * Manages loading, refreshing, error states with:
 * - Idempotency (multiple triggers ≠ multiple fetches)
 * - Parallel call prevention
 * - Network failure handling
 * - Lifecycle safety
 * - Automatic foreground refresh
 * 
 * ALL screens must use this hook instead of local useState refresh logic.
 * 
 * @example
 * ```typescript
 * const { state, refresh, fetchInitial } = useRefreshController({
 *   fetchInitial: async () => {
 *     const data = await fetchPosts();
 *     setPosts(data);
 *     return data;
 *   },
 *   refresh: async () => {
 *     const data = await fetchPosts();
 *     setPosts(data);
 *     return data;
 *   },
 * });
 * 
 * // In component
 * <FlatList
 *   data={posts}
 *   refreshing={state.refreshing}
 *   onRefresh={refresh}
 * />
 * ```
 */
export function useRefreshController<T = any>(
    contract: RefreshContract<T>,
    options: RefreshControllerOptions = {}
) {
    const {
        refreshOnForeground = true,
        minRefreshInterval = 1000,
        autoRetry = false,
        maxRetries = 3,
        retryDelay = 2000,
        debug = __DEV__,
    } = options;

    // State
    const [state, setState] = useState<RefreshState>({
        loading: false,
        refreshing: false,
        loadingMore: false,
        error: null,
        lastRefreshTime: null,
    });

    // Refs for preventing parallel calls and tracking retries
    const isRefreshingRef = useRef(false);
    const isLoadingMoreRef = useRef(false);
    const retryCountRef = useRef(0);
    const lastRefreshTimeRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    // Debug logging
    const log = useCallback((message: string, ...args: any[]) => {
        if (debug) {
            console.log(`[RefreshController] ${message}`, ...args);
        }
    }, [debug]);

    /**
     * 🔐 IDEMPOTENT REFRESH
     * 
     * Prevents parallel refresh calls
     * Enforces minimum refresh interval
     */
    const refresh = useCallback(async (): Promise<T | null> => {
        // 🔐 GUARD: Prevent parallel refresh
        if (isRefreshingRef.current) {
            log('Refresh already in progress, skipping');
            return null;
        }

        // 🔐 GUARD: Enforce minimum refresh interval
        const now = Date.now();
        if (lastRefreshTimeRef.current && (now - lastRefreshTimeRef.current) < minRefreshInterval) {
            log('Refresh called too soon, skipping', {
                timeSinceLastRefresh: now - lastRefreshTimeRef.current,
                minInterval: minRefreshInterval,
            });
            return null;
        }

        isRefreshingRef.current = true;

        if (isMountedRef.current) {
            setState(prev => ({ ...prev, refreshing: true, error: null }));
        }

        log('Starting refresh');

        try {
            const result = await contract.refresh();

            if (isMountedRef.current) {
                lastRefreshTimeRef.current = Date.now();
                retryCountRef.current = 0; // Reset retry count on success

                setState(prev => ({
                    ...prev,
                    refreshing: false,
                    error: null,
                    lastRefreshTime: Date.now(),
                }));

                log('Refresh completed successfully');
            }

            return result;
        } catch (error: any) {
            log('Refresh failed:', error.message);

            if (isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    refreshing: false,
                    error,
                }));
            }

            // 🔐 AUTO-RETRY on network failure
            if (autoRetry && retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                log(`Retrying refresh (attempt ${retryCountRef.current}/${maxRetries})`);

                setTimeout(() => {
                    if (isMountedRef.current) {
                        refresh();
                    }
                }, retryDelay);
            }

            return null;
        } finally {
            isRefreshingRef.current = false;
        }
    }, [contract, minRefreshInterval, autoRetry, maxRetries, retryDelay, log]);

    /**
     * Initial fetch (called once on mount)
     */
    const fetchInitial = useCallback(async (): Promise<T | null> => {
        if (!isMountedRef.current) return null;

        setState(prev => ({ ...prev, loading: true, error: null }));
        log('Starting initial fetch');

        try {
            const result = await contract.fetchInitial();

            if (isMountedRef.current) {
                lastRefreshTimeRef.current = Date.now();
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: null,
                    lastRefreshTime: Date.now(),
                }));

                log('Initial fetch completed successfully');
            }

            return result;
        } catch (error: any) {
            log('Initial fetch failed:', error.message);

            if (isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error,
                }));
            }

            return null;
        }
    }, [contract, log]);

    /**
     * Load more (pagination)
     */
    const loadMore = useCallback(async (): Promise<T | null> => {
        if (!contract.loadMore) {
            log('loadMore not implemented in contract');
            return null;
        }

        // 🔐 GUARD: Prevent parallel loadMore calls
        if (isLoadingMoreRef.current) {
            log('loadMore already in progress, skipping');
            return null;
        }

        isLoadingMoreRef.current = true;

        if (isMountedRef.current) {
            setState(prev => ({ ...prev, loadingMore: true }));
        }

        log('Starting loadMore');

        try {
            const result = await contract.loadMore();

            if (isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    loadingMore: false,
                }));

                log('loadMore completed successfully');
            }

            return result;
        } catch (error: any) {
            log('loadMore failed:', error.message);

            if (isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    loadingMore: false,
                    error,
                }));
            }

            return null;
        } finally {
            isLoadingMoreRef.current = false;
        }
    }, [contract, log]);

    /**
     * Manual retry (for error recovery)
     */
    const retry = useCallback(async () => {
        log('Manual retry triggered');
        retryCountRef.current = 0; // Reset retry count
        return refresh();
    }, [refresh, log]);

    /**
     * 🔐 LIFECYCLE: Auto-refresh on app foreground
     */
    useEffect(() => {
        if (!refreshOnForeground) return;

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && isMountedRef.current) {
                log('App foregrounded, triggering refresh');

                // Only refresh if last refresh was more than 30 seconds ago
                const now = Date.now();
                if (!lastRefreshTimeRef.current || (now - lastRefreshTimeRef.current) > 30000) {
                    refresh();
                } else {
                    log('Skipping foreground refresh (data is fresh)');
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [refreshOnForeground, refresh, log]);

    /**
     * 🔐 LIFECYCLE: Cleanup on unmount
     */
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            isRefreshingRef.current = false;
            isLoadingMoreRef.current = false;
            log('Cleanup: Controller unmounted');
        };
    }, [log]);

    return {
        /** Current refresh state */
        state,

        /** Manual refresh (pull-to-refresh) */
        refresh,

        /** Initial fetch */
        fetchInitial,

        /** Load more (pagination) */
        loadMore,

        /** Manual retry (error recovery) */
        retry,

        /** Convenience getters */
        isLoading: state.loading,
        isRefreshing: state.refreshing,
        isLoadingMore: state.loadingMore,
        hasError: state.error !== null,
        error: state.error,
    };
}

/**
 * 🔐 PROGRAMMATIC REFRESH TRIGGER
 * 
 * Global event emitter for programmatic refresh triggers
 * 
 * Usage:
 * ```typescript
 * // Trigger refresh
 * triggerRefresh('home');
 * triggerRefresh('profile', userId);
 * 
 * // Listen for refresh
 * useRefreshListener('home', () => {
 *   refresh();
 * });
 * ```
 */
type RefreshListener = () => void;
const refreshListeners = new Map<string, Set<RefreshListener>>();

export function triggerRefresh(scope: string, ...args: any[]) {
    const listeners = refreshListeners.get(scope);
    if (listeners) {
        if (__DEV__) {
            console.log(`[RefreshTrigger] Triggering refresh for scope: ${scope}`, args);
        }
        listeners.forEach(listener => listener());
    }
}

export function useRefreshListener(scope: string, callback: RefreshListener) {
    useEffect(() => {
        if (!refreshListeners.has(scope)) {
            refreshListeners.set(scope, new Set());
        }

        const listeners = refreshListeners.get(scope)!;
        listeners.add(callback);

        if (__DEV__) {
            console.log(`[RefreshListener] Registered listener for scope: ${scope}`);
        }

        return () => {
            listeners.delete(callback);
            if (listeners.size === 0) {
                refreshListeners.delete(scope);
            }

            if (__DEV__) {
                console.log(`[RefreshListener] Unregistered listener for scope: ${scope}`);
            }
        };
    }, [scope, callback]);
}

/**
 * 🔐 STANDARD RETRY UI COMPONENT
 * 
 * Provides consistent retry UI across all screens
 */
export interface RetryUIProps {
    error: Error | null;
    onRetry: () => void;
    message?: string;
}

// Export types for use in screens
export type { RefreshContract, RefreshState, RefreshControllerOptions };
