import RNFS from 'react-native-fs';

/**
 * Session ID Generator
 * Pure function. Deterministic format.
 */
export type CreateSessionId = string;

export function generateSessionId(): CreateSessionId {
    return `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

/**
 * Session Lifecycle Manager
 * Handles filesystem isolation for Create artifacts.
 */
export const SessionManager = {
    /**
     * Resolves the strict temporary directory for a specific session.
     * Format: <CacheDir>/create_sessions/<sessionId>/
     */
    getSessionDir: (sessionId: CreateSessionId): string => {
        return `${RNFS.CachesDirectoryPath}/create_sessions/${sessionId}`;
    },

    /**
     * Initializes the session workspace.
     * MUST be called at the start of the pipeline (MediaPick -> Adjust).
     */
    initializeSession: async (sessionId: CreateSessionId): Promise<void> => {
        const path = SessionManager.getSessionDir(sessionId);
        const exists = await RNFS.exists(path);
        if (!exists) {
            await RNFS.mkdir(path);
        }
    },

    /**
     * Nuclear cleanup.
     * MUST be called on:
     * 1. Successful Publish
     * 2. Explicit Cancel (User exits flow)
     * 3. App Boot (to clean stale sessions)
     */
    cleanupSession: async (sessionId: CreateSessionId): Promise<void> => {
        const path = SessionManager.getSessionDir(sessionId);
        try {
            const exists = await RNFS.exists(path);
            if (exists) {
                await RNFS.unlink(path);
            }
        } catch (e) {
            console.warn(`[CreateSession] Failed to cleanup session ${sessionId}`, e);
            // Swallow error - we don't want to crash on cleanup
        }
    },

    /**
     * Garbage Collection for stale sessions.
     * Should be run on app mount.
     */
    clearAllSessions: async (): Promise<void> => {
        const rootPath = `${RNFS.CachesDirectoryPath}/create_sessions`;
        try {
            const exists = await RNFS.exists(rootPath);
            if (exists) {
                await RNFS.unlink(rootPath);
            }
        } catch (e) {
            console.warn('[CreateSession] Failed to clear all sessions', e);
        }
    }
};
