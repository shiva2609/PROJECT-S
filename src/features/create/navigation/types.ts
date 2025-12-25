import { MediaPickResult, AdjustResult } from '../contracts';

/**
 * Navigation Contract
 * 
 * Defines the strict params allowed between screens.
 * This is a Type Definition only. No React components here.
 */

export type CreateStackParamList = {
    // Phase 1 -> 2
    // MediaPick is the entry, no params needed usually, but could accept an intent 
    MediaPick: undefined;

    // Phase 2
    // Must receive a valid selection
    Adjust: {
        selection: MediaPickResult;
        sessionId: string;
    };

    // Phase 3
    // Must receive a processed result
    Details: {
        result: AdjustResult;
    };
};

// Start of flow helper type
export type CreateFlowRouteName = keyof CreateStackParamList;
