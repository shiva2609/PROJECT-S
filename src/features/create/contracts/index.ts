/**
 * IMMUTABLE DATA CONTRACTS
 * 
 * These types define the "Truth" at each stage of the pipeline.
 * They are readonly to enforce unidirectional data flow.
 */

// ============================================================================
// PHASE 1: Media Selection
// ============================================================================
export interface MediaPickResult {
    readonly originalUri: string; // Absolute path to strict local file
    readonly source: 'library' | 'camera';
    readonly mimeType: 'image/jpeg' | 'image/png';
    readonly width: number;
    readonly height: number;
    readonly fileSize: number;
    readonly timestamp: number;
}

// ============================================================================
// PHASE 2: Adjustment & Processing
// ============================================================================
export interface AdjustResult {
    readonly sessionId: string; // Traceability
    readonly originalReference: MediaPickResult; // Lineage
    readonly finalBitmapUri: string; // The ACTUAL artifact to upload

    // Metadata for audit (what the user *saw* vs what we generated)
    readonly cropMetadata: {
        readonly zoom: number;
        readonly offsetX: number;
        readonly offsetY: number;
        readonly aspectRatio: '1:1' | '4:5' | '16:9';
        readonly cropWidth: number;
        readonly cropHeight: number;
    };
}

// ============================================================================
// PHASE 3: Details & Semantics
// ============================================================================
// The atomic payload ready for the network
export interface PostPayload {
    readonly sessionId: string;

    // Visuals
    readonly mediaUri: string; // Validated local file path
    readonly width: number;
    readonly height: number;
    readonly aspectRatio: number;

    // Semantics
    readonly caption: string;
    // Location is strictly typed if present
    readonly location: {
        readonly id: string;
        readonly name: string;
        readonly coords?: { lat: number; lng: number };
    } | null;
    readonly tags: string[]; // User IDs of tagged users (Coming Soon)
    readonly hashtags: string[]; // Normalized topics (e.g. "travel", "nature")
}

// ============================================================================
// SIGNALS
// ============================================================================
// Success result for the entire pipeline
export interface CreatePipelineSuccess {
    postId: string;
    status: 'published';
}
