import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string | null;
}

/**
 * useNetworkState
 * 
 * Canonical source of truth for network connectivity.
 * Subscribes once to NetInfo and provides current state + check function.
 */
export function useNetworkState() {
    const [networkState, setNetworkState] = useState<NetworkState>({
        isConnected: true, // Optimistic default
        isInternetReachable: true,
        type: null,
    });

    useEffect(() => {
        // 🔐 RESILIENCE: Check if native module exists
        if (!NetInfo || typeof NetInfo.addEventListener !== 'function') {
            console.warn('⚠️ [useNetworkState] NetInfo native module is null or missing addeventListener! Rebuild may be required.');
            return;
        }

        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setNetworkState({
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
            });
        });

        return () => unsubscribe();
    }, []);

    /**
     * Passive check: returns current state without triggering a refresh
     */
    const checkNetwork = useCallback((): boolean => {
        // If native module is missing, assume connected
        if (!NetInfo) return true;

        // If isConnected is explicitly false, we are offline
        if (networkState.isConnected === false) return false;

        // If isInternetReachable is explicitly false, we are offline (connected to wifi but no internet)
        if (networkState.isInternetReachable === false) return false;

        // Otherwise assume connected (null or true)
        return true;
    }, [networkState]);

    return {
        ...networkState,
        checkNetwork,
        isOffline: !checkNetwork(),
    };
}

/**
 * Global helper to check network status outside components
 */
export async function checkNetworkStatus(): Promise<boolean> {
    try {
        // 🔐 RESILIENCE: Check if native module exists
        if (!NetInfo || typeof NetInfo.fetch !== 'function') {
            console.warn('⚠️ [checkNetworkStatus] NetInfo native module is null! Falling back to online.');
            return true;
        }

        const state = await NetInfo.fetch();
        return (state.isConnected ?? false) && (state.isInternetReachable ?? true);
    } catch (error) {
        console.error('❌ [checkNetworkStatus] Error fetching network state:', error);
        return true; // Fallback to online so we don't block the user from posting
    }
}
