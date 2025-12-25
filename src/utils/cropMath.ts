import { Dimensions } from 'react-native';
export type AspectRatio = '1:1' | '4:5' | '16:9';

export interface CropParams {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_PADDING = 20;
// Calculate available height more conservatively
// screen - header (60) - slider (64) - preview (220) - thumbnails (84) - safe area (40) - padding (40)
const HEADER_HEIGHT = 60;
const SLIDER_HEIGHT = 64;
const PREVIEW_HEIGHT = 220;
const THUMBNAIL_HEIGHT = 84;
const SAFE_AREA_TOP = 40;
const EXTRA_PADDING = 40;
const AVAILABLE_HEIGHT = Math.max(200, SCREEN_HEIGHT - HEADER_HEIGHT - SLIDER_HEIGHT - PREVIEW_HEIGHT - THUMBNAIL_HEIGHT - SAFE_AREA_TOP - EXTRA_PADDING);

/**
 * Calculate crop box dimensions based on aspect ratio
 */
export function getCropBoxDimensions(ratio: AspectRatio): { width: number; height: number } {
  const availableWidth = SCREEN_WIDTH - CROP_PADDING * 2;
  const availableHeight = AVAILABLE_HEIGHT;

  let width: number;
  let height: number;

  switch (ratio) {
    case '1:1':
      width = Math.min(availableWidth, availableHeight);
      height = width;
      break;
    case '4:5':
      width = Math.min(availableWidth, (availableHeight * 4) / 5);
      height = (width * 5) / 4;
      break;
    case '16:9':
      width = Math.min(availableWidth, (availableHeight * 16) / 9);
      height = (width * 9) / 16;
      break;
  }

  return { width, height };
}

/**
 * Calculate minimum scale to cover crop box (fit-cover behavior)
 */
export function calculateMinScale(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number
): number {
  if (imageWidth === 0 || imageHeight === 0) return 1;

  const imageAspect = imageWidth / imageHeight;
  const cropAspect = cropWidth / cropHeight;

  if (imageAspect > cropAspect) {
    // Image is wider - scale to fit height
    return cropHeight / imageHeight;
  } else {
    // Image is taller - scale to fit width
    return cropWidth / imageWidth;
  }
}

/**
 * Calculate scale to fit image entirely within crop box (fit-contain behavior)
 */
export function calculateFitScale(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number
): number {
  if (imageWidth === 0 || imageHeight === 0) return 1;

  const imageAspect = imageWidth / imageHeight;
  const cropAspect = cropWidth / cropHeight;

  if (imageAspect > cropAspect) {
    // Image is wider - scale to fit width
    return cropWidth / imageWidth;
  } else {
    // Image is taller - scale to fit height
    return cropHeight / imageHeight;
  }
}

/**
 * Clamp translation values to keep image covering crop box
 */
export function clampTranslation(
  translateX: number,
  translateY: number,
  scale: number,
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number
): { x: number; y: number } {
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;

  const maxTranslateX = Math.max(0, (scaledWidth - cropWidth) / 2);
  const maxTranslateY = Math.max(0, (scaledHeight - cropHeight) / 2);

  return {
    x: Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX)),
    y: Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY)),
  };
}

/**
 * Calculate transform style for image based on crop params
 */
export function getImageTransform(
  cropParams: CropParams,
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number
): {
  transform: Array<{ translateX: number } | { translateY: number } | { scale: number }>;
} {
  const clamped = clampTranslation(
    cropParams.offsetX,
    cropParams.offsetY,
    cropParams.zoom,
    imageWidth,
    imageHeight,
    cropWidth,
    cropHeight
  );

  return {
    transform: [
      { translateX: clamped.x },
      { translateY: clamped.y },
      { scale: cropParams.zoom },
    ],
  };
}

/**
 * Calculate crop rectangle for native cropping
 * Maps transform params to absolute pixel crop rect on original image
 */
export function computeCropRect(
  imageWidth: number,
  imageHeight: number,
  cropParams: CropParams,
  cropWidth: number,
  cropHeight: number,
  targetRatio: AspectRatio
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  // Calculate the visible area in the original image coordinates
  const scaledWidth = imageWidth * cropParams.zoom;
  const scaledHeight = imageHeight * cropParams.zoom;

  // Calculate the center point of the crop box in scaled image coordinates
  const cropCenterX = scaledWidth / 2 - cropParams.offsetX;
  const cropCenterY = scaledHeight / 2 - cropParams.offsetY;

  // Convert to original image coordinates
  const originalCenterX = cropCenterX / cropParams.zoom;
  const originalCenterY = cropCenterY / cropParams.zoom;

  // Calculate crop size in original image coordinates
  const cropSizeInOriginalX = cropWidth / cropParams.zoom;
  const cropSizeInOriginalY = cropHeight / cropParams.zoom;

  // Calculate output dimensions based on ratio
  let outputWidth: number;
  let outputHeight: number;
  switch (targetRatio) {
    case '1:1':
      outputWidth = 1080;
      outputHeight = 1080;
      break;
    case '4:5':
      outputWidth = 1080;
      outputHeight = 1350;
      break;
    case '16:9':
      outputWidth = 1920;
      outputHeight = 1080;
      break;
  }

  // Calculate the aspect ratio of the crop box
  const cropAspect = cropWidth / cropHeight;
  const outputAspect = outputWidth / outputHeight;

  // Calculate actual crop dimensions maintaining aspect ratio
  let actualCropWidth: number;
  let actualCropHeight: number;

  if (cropAspect > outputAspect) {
    // Crop box is wider - fit to height
    actualCropHeight = cropSizeInOriginalY;
    actualCropWidth = actualCropHeight * outputAspect;
  } else {
    // Crop box is taller - fit to width
    actualCropWidth = cropSizeInOriginalX;
    actualCropHeight = actualCropWidth / outputAspect;
  }

  // Calculate top-left corner
  const x = Math.max(0, originalCenterX - actualCropWidth / 2);
  const y = Math.max(0, originalCenterY - actualCropHeight / 2);

  // Ensure crop rect doesn't exceed image bounds
  const finalWidth = Math.min(actualCropWidth, imageWidth - x);
  const finalHeight = Math.min(actualCropHeight, imageHeight - y);

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(finalWidth),
    height: Math.round(finalHeight),
  };
}

