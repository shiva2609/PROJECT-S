/**
 * IMAGE PIPELINE INVARIANT ENFORCEMENT
 * 
 * 🔐 HARD INVARIANTS:
 * 1. After crop completion, original image URIs are ILLEGAL
 * 2. All previews must render ONLY finalUri (exported bitmap)
 * 3. Uploads must accept ONLY finalized images (finalUri)
 * 4. A post must be BLOCKED if ANY media item lacks a valid finalUri
 * 5. Silent fallbacks to original URIs are FORBIDDEN
 * 
 * This module enforces these invariants at runtime with fail-fast behavior in development.
 */

import { Platform } from 'react-native';

// Type definitions
export interface FinalizedMedia {
  id: string;
  finalUri: string; // REQUIRED - The actual cropped bitmap file
  ratio: '1:1' | '4:5' | '16:9';
  type: 'image' | 'video';
  cropData?: {
    ratio: '1:1' | '4:5' | '16:9';
    zoomScale: number;
    offsetX: number;
    offsetY: number;
    frameWidth: number;
    frameHeight: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  invalidIndices: number[];
}

/**
 * INVARIANT 1: Validate that URI is a finalized bitmap, not an original image
 * 
 * A finalized bitmap URI should:
 * - Exist (not null/undefined/empty)
 * - Be a file:// URI (local file system)
 * - NOT be from camera roll (content://, assets-library://, ph://)
 * - NOT be a remote URL (http://, https://)
 */
export function assertIsFinalizedBitmap(uri: string | null | undefined, context: string): void {
  if (__DEV__) {
    // Check 1: URI must exist
    if (!uri || typeof uri !== 'string' || uri.trim() === '') {
      throw new Error(
        `🚨 INVARIANT VIOLATION [${context}]: finalUri is missing or empty.\n` +
        `Expected: A valid file:// URI to a cropped bitmap.\n` +
        `Received: ${JSON.stringify(uri)}\n` +
        `This indicates exportFinalBitmap() was not called or failed.`
      );
    }

    // Check 2: Must be a local file URI
    const normalizedUri = uri.trim().toLowerCase();
    
    // FORBIDDEN: Camera roll URIs (original images)
    if (
      normalizedUri.startsWith('content://') || // Android camera roll
      normalizedUri.startsWith('assets-library://') || // iOS camera roll (old)
      normalizedUri.startsWith('ph://') // iOS Photos framework
    ) {
      throw new Error(
        `🚨 INVARIANT VIOLATION [${context}]: Detected ORIGINAL image URI from camera roll.\n` +
        `URI: ${uri.substring(0, 100)}...\n` +
        `Original image URIs are ILLEGAL after crop completion.\n` +
        `You MUST use finalUri (exported bitmap) instead.`
      );
    }

    // FORBIDDEN: Remote URLs (should be local files before upload)
    if (normalizedUri.startsWith('http://') || normalizedUri.startsWith('https://')) {
      throw new Error(
        `🚨 INVARIANT VIOLATION [${context}]: Detected remote URL instead of local bitmap.\n` +
        `URI: ${uri.substring(0, 100)}...\n` +
        `Before upload, images must be local file:// URIs.\n` +
        `Remote URLs should only exist AFTER upload to Firebase Storage.`
      );
    }

    // REQUIRED: Must be a file:// URI (local file system)
    if (!normalizedUri.startsWith('file://') && !normalizedUri.startsWith('/')) {
      console.warn(
        `⚠️ WARNING [${context}]: URI does not start with file:// or /\n` +
        `URI: ${uri.substring(0, 100)}...\n` +
        `This may indicate an invalid or non-standard file path.`
      );
    }
  }
}

/**
 * INVARIANT 2: Validate finalMedia array before preview/upload
 * 
 * Ensures:
 * - Array is not empty
 * - Every item has a valid finalUri
 * - No original URIs leaked into the array
 * - Aspect ratio consistency (all images use same ratio)
 */
export function validateFinalMediaArray(
  finalMedia: FinalizedMedia[] | null | undefined,
  context: string
): ValidationResult {
  const errors: string[] = [];
  const invalidIndices: number[] = [];

  // Check 1: Array must exist and not be empty
  if (!finalMedia || !Array.isArray(finalMedia)) {
    errors.push(`finalMedia is not an array: ${typeof finalMedia}`);
    return { isValid: false, errors, invalidIndices };
  }

  if (finalMedia.length === 0) {
    errors.push('finalMedia array is empty - at least one image required');
    return { isValid: false, errors, invalidIndices };
  }

  // Check 2: Every item must have a valid finalUri
  finalMedia.forEach((item, index) => {
    if (!item) {
      errors.push(`Item at index ${index} is null/undefined`);
      invalidIndices.push(index);
      return;
    }

    if (!item.finalUri || typeof item.finalUri !== 'string' || item.finalUri.trim() === '') {
      errors.push(`Item at index ${index} is missing finalUri`);
      invalidIndices.push(index);
      return;
    }

    // Validate that finalUri is actually a finalized bitmap
    try {
      assertIsFinalizedBitmap(item.finalUri, `${context}[${index}]`);
    } catch (error: any) {
      errors.push(`Item at index ${index}: ${error.message}`);
      invalidIndices.push(index);
    }
  });

  // Check 3: Aspect ratio consistency (Instagram-style: one ratio per post)
  if (finalMedia.length > 1) {
    const firstRatio = finalMedia[0]?.ratio;
    const inconsistentRatios = finalMedia.filter((item, index) => {
      if (index === 0) return false;
      return item.ratio !== firstRatio;
    });

    if (inconsistentRatios.length > 0) {
      errors.push(
        `Aspect ratio inconsistency detected. First image: ${firstRatio}, ` +
        `but ${inconsistentRatios.length} images have different ratios. ` +
        `All images in a post must use the same aspect ratio (Instagram-style).`
      );
    }
  }

  const isValid = errors.length === 0;

  // In development, throw on validation failure
  if (__DEV__ && !isValid) {
    throw new Error(
      `🚨 INVARIANT VIOLATION [${context}]: finalMedia validation failed.\n` +
      `Errors:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}\n` +
      `Invalid indices: ${invalidIndices.join(', ')}\n` +
      `Total items: ${finalMedia.length}\n` +
      `This indicates incomplete crop processing or data corruption.`
    );
  }

  return { isValid, errors, invalidIndices };
}

/**
 * INVARIANT 3: Block navigation forward unless all images are finalized
 * 
 * Call this before:
 * - Navigating from CropAdjust to Preview
 * - Navigating from Preview to Upload
 * - Initiating upload
 */
export function assertAllImagesFinalized(
  finalMedia: FinalizedMedia[],
  totalExpected: number,
  context: string
): void {
  if (__DEV__) {
    // Check 1: Count must match
    if (finalMedia.length !== totalExpected) {
      throw new Error(
        `🚨 INVARIANT VIOLATION [${context}]: Image count mismatch.\n` +
        `Expected: ${totalExpected} finalized images\n` +
        `Received: ${finalMedia.length} finalized images\n` +
        `This indicates incomplete crop processing.`
      );
    }

    // Check 2: Validate entire array
    validateFinalMediaArray(finalMedia, context);
  }
}

/**
 * INVARIANT 4: Sanitize data structures to remove original URIs
 * 
 * Ensures that ONLY finalUri exists in data passed beyond crop completion.
 * Removes:
 * - originalUri
 * - transform params (zoom, offset)
 * - crop metadata (should not be needed after export)
 */
export function sanitizeFinalMedia(media: any[]): FinalizedMedia[] {
  return media.map((item, index) => {
    // Ensure finalUri exists
    if (!item.finalUri) {
      if (__DEV__) {
        throw new Error(
          `🚨 INVARIANT VIOLATION [sanitizeFinalMedia]: Item at index ${index} missing finalUri.\n` +
          `Cannot sanitize media without finalUri.`
        );
      }
      // In production, skip invalid items (should never happen)
      return null;
    }

    // Return ONLY the essential fields
    return {
      id: item.id || item.finalUri,
      finalUri: item.finalUri, // ONLY field for image URI
      ratio: item.ratio || item.cropData?.ratio || '4:5',
      type: item.type || 'image',
      // cropData is optional (for re-editing), but originalUri is FORBIDDEN
    };
  }).filter((item): item is FinalizedMedia => item !== null);
}

/**
 * INVARIANT 5: Validate upload payload
 * 
 * Ensures that upload receives ONLY finalized bitmaps.
 * Call this immediately before uploadImageAsync().
 */
export function assertValidUploadPayload(
  imageUri: string,
  userId: string,
  context: string
): void {
  if (__DEV__) {
    // Check 1: URI must be finalized bitmap
    assertIsFinalizedBitmap(imageUri, `${context}.imageUri`);

    // Check 2: userId must be valid
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error(
        `🚨 INVARIANT VIOLATION [${context}]: userId is missing or invalid.\n` +
        `userId: ${JSON.stringify(userId)}\n` +
        `Upload requires a valid authenticated user ID.`
      );
    }

    // Check 3: Log upload for audit trail
    console.log(
      `✅ [${context}] Upload validation passed:\n` +
      `  URI: ${imageUri.substring(0, 80)}...\n` +
      `  User: ${userId}\n` +
      `  Platform: ${Platform.OS}`
    );
  }
}

/**
 * DEV-ONLY: Log invariant check for debugging
 */
export function logInvariantCheck(context: string, passed: boolean, details?: string): void {
  if (__DEV__) {
    const emoji = passed ? '✅' : '❌';
    const message = `${emoji} [INVARIANT CHECK] ${context}`;
    if (details) {
      console.log(`${message}\n  ${details}`);
    } else {
      console.log(message);
    }
  }
}

/**
 * Helper: Check if URI appears to be an original image (not finalized)
 */
export function isOriginalImageUri(uri: string): boolean {
  if (!uri) return false;
  const normalized = uri.toLowerCase();
  return (
    normalized.startsWith('content://') ||
    normalized.startsWith('assets-library://') ||
    normalized.startsWith('ph://')
  );
}

/**
 * Helper: Check if URI appears to be a finalized bitmap
 */
export function isFinalizedBitmapUri(uri: string): boolean {
  if (!uri) return false;
  const normalized = uri.toLowerCase();
  return (
    (normalized.startsWith('file://') || normalized.startsWith('/')) &&
    !isOriginalImageUri(uri)
  );
}
