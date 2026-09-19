/**
 * Client-Side Emergency WebP Image Compressor
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Media Engine
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum ImageQualityTier {
  ULTRA_LOW = 'ultra_low', // 320x240 WebP (5 - 12 KB, Emergency Default)
  STANDARD = 'standard',   // 640x480 WebP (18 - 35 KB, Normal Mesh)
  HIGH = 'high'            // 1280x720 WebP (80 - 150 KB, Online / Wi-Fi)
}

export interface ICompressedImageResult {
  tier: ImageQualityTier;
  targetWidth: number;
  targetHeight: number;
  estimatedBytes: number;
  format: 'image/webp';
  isOfflineAllowed: boolean;
}

export class ImageCompressor {
  /**
   * Calculates optimal downscale dimensions and target budget based on quality tier
   */
  public static calculateTargetSpecs(
    origWidth: number,
    origHeight: number,
    tier: ImageQualityTier = ImageQualityTier.ULTRA_LOW
  ): ICompressedImageResult {
    let maxWidth = 320;
    let maxHeight = 240;
    let maxBytes = 12 * 1024; // 12 KB target for ultra-low

    if (tier === ImageQualityTier.STANDARD) {
      maxWidth = 640;
      maxHeight = 480;
      maxBytes = 35 * 1024;
    } else if (tier === ImageQualityTier.HIGH) {
      maxWidth = 1280;
      maxHeight = 720;
      maxBytes = 150 * 1024;
    }

    // Maintain aspect ratio
    const ratio = Math.min(maxWidth / origWidth, maxHeight / origHeight, 1.0);
    const targetWidth = Math.round(origWidth * ratio);
    const targetHeight = Math.round(origHeight * ratio);

    return {
      tier,
      targetWidth,
      targetHeight,
      estimatedBytes: maxBytes,
      format: 'image/webp',
      isOfflineAllowed: true
    };
  }

  /**
   * Validates media file type: Video is strictly blocked in offline disaster mode
   */
  public static isMediaTypePermitted(mimeType: string, isOfflineMode = true): boolean {
    if (isOfflineMode) {
      // Videos are strictly forbidden in offline mesh mode to conserve airtime & battery
      if (mimeType.startsWith('video/')) {
        return false;
      }
      return mimeType.startsWith('image/') || mimeType.startsWith('audio/');
    }
    return true;
  }
}
