/**
 * Media upload utility
 * Handles uploading images and videos to storage
 * Returns standardized format for use across the app
 */

export interface MediaFile {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
}

export interface UploadOptions {
  uri: string;
  type: 'image' | 'video';
  path?: string; // Storage path (e.g., 'posts', 'profile', 'messages')
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export interface UploadResult {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  size?: number;
}

/**
 * Upload media file to storage
 * Placeholder implementation - will be connected to Firebase Storage in Phase 4
 */
export async function uploadMedia(options: UploadOptions): Promise<UploadResult | null> {
  const { uri, type, path = 'uploads' } = options;

  try {
    // Placeholder: In Phase 4, this will:
    // 1. Compress image if needed (using react-native-image-resizer)
    // 2. Upload to Firebase Storage
    // 3. Get download URL
    // 4. Return standardized format

    // For now, return the local URI as-is
    // This allows the app to work with local files during development
    return {
      uri,
      type,
    };
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}

