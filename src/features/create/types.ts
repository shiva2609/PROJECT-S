/**
 * Create Pipeline - Immutable Data Contracts
 * 
 * Defines the strict types passed between screens in the creation flow.
 * Global state is FORBIDDEN. All state is passed via navigation params.
 */

// 1. MediaPick Phase
// Outcome: A single valid original asset
export interface MediaPickResult {
    readonly originalUri: string; // Absolute path
    readonly source: 'library' | 'camera';
    readonly mimeType: string;
    readonly width: number;
    readonly height: number;
    readonly fileSize: number;
}

// 2. Adjust Phase
// Outcome: A processed, upload-ready bitmap + audit metadata
export interface AdjustResult {
    readonly originalReference: MediaPickResult;
    readonly finalBitmapUri: string; // The ACTUAL cropped file to upload

    // Metadata for audit/UI restoration (not used for upload processing)
    readonly cropMetadata: {
        readonly zoom: number;
        readonly offsetX: number;
        readonly offsetY: number;
        readonly aspectRatio: '1:1' | '4:5' | '16:9';
        readonly cropWidth: number;
        readonly cropHeight: number;
    };
}

// 3. Details Phase
// Outcome: Final payload ready for atomic commit
export interface PostPayload {
    // Visuals
    readonly mediaUri: string; // From AdjustResult.finalBitmapUri
    readonly aspectRatio: number; // Derived from AdjustResult
    readonly width: number;
    readonly height: number;

    // Semantics
    readonly caption: string;
    readonly location: {
        readonly id: string;
        readonly name: string;
        readonly coords: { lat: number; lng: number };
    } | null;
    readonly tags: string[]; // User IDs of tagged users
}

// Navigation Param List
export type CreateStackParamList = {
    MediaPick: undefined;
    Adjust: { selection: MediaPickResult };
    Details: { result: AdjustResult };
};
