/**
 * Unit tests for ImageCompressor (WebP Ultra-low 320x240 vs Standard & Video Guard)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { ImageCompressor, ImageQualityTier } from '../../../src/core/media/ImageCompressor';

describe('ImageCompressor (Emergency WebP Compression & Guard)', () => {
  it('should downscale 4K photo (3840x2160) to 320x180 WebP in Ultra-Low Emergency tier', () => {
    const specs = ImageCompressor.calculateTargetSpecs(3840, 2160, ImageQualityTier.ULTRA_LOW);

    expect(specs.targetWidth).toBeLessThanOrEqual(320);
    expect(specs.targetHeight).toBeLessThanOrEqual(240);
    expect(specs.format).toBe('image/webp');
    expect(specs.estimatedBytes).toBeLessThanOrEqual(12 * 1024);
  });

  it('should downscale photo to 640x360 in Standard tier', () => {
    const specs = ImageCompressor.calculateTargetSpecs(1920, 1080, ImageQualityTier.STANDARD);

    expect(specs.targetWidth).toBe(640);
    expect(specs.targetHeight).toBe(360);
    expect(specs.estimatedBytes).toBeLessThanOrEqual(35 * 1024);
  });

  it('should strictly forbid video transfer in offline disaster mesh mode', () => {
    expect(ImageCompressor.isMediaTypePermitted('video/mp4', true)).toBe(false);
    expect(ImageCompressor.isMediaTypePermitted('video/webm', true)).toBe(false);
    expect(ImageCompressor.isMediaTypePermitted('image/jpeg', true)).toBe(true);
    expect(ImageCompressor.isMediaTypePermitted('audio/opus', true)).toBe(true);
  });
});
