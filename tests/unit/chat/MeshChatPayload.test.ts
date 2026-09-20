/**
 * Unit tests for MeshChatPayload (Sprint E Task E.5)
 * Verifies WebP image compression specs, Opus audio duration limits, and E2EE payload encryption
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Media & E2EE Chat Engine
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { ImageCompressor, ImageQualityTier } from '../../../src/core/media/ImageCompressor';
import { VoiceMemoRecorder } from '../../../src/core/media/VoiceMemoRecorder';
import { MediaPayloadSecurity } from '../../../src/core/media/MediaPayloadSecurity';
import { CryptoEngine } from '../../../src/core/crypto/CryptoEngine';

describe('MeshChatPayload (Sprint E Task E.5 Media Chunking & E2EE Encryption)', () => {
  it('should calculate ultra-low downscale specs for disaster WebP photos (<= 12 KB target)', () => {
    const origWidth = 4032;
    const origHeight = 3024;

    const specs = ImageCompressor.calculateTargetSpecs(origWidth, origHeight, ImageQualityTier.ULTRA_LOW);

    expect(specs.format).toBe('image/webp');
    expect(specs.targetWidth).toBeLessThanOrEqual(320);
    expect(specs.targetHeight).toBeLessThanOrEqual(240);
    expect(specs.estimatedBytes).toBeLessThanOrEqual(12 * 1024);
    expect(specs.isOfflineAllowed).toBe(true);
  });

  it('should enforce strict 15s limit and validation rules for Opus voice memos', () => {
    const audioSpecs = VoiceMemoRecorder.getAudioSpecs();

    expect(audioSpecs.codec).toBe('audio/opus');
    expect(audioSpecs.maxDurationSec).toBe(15);
    expect(audioSpecs.channels).toBe(1); // Mono for ultra-low bandwidth

    // Valid voice memo (3.5s, confirmed by user)
    const validMemo = VoiceMemoRecorder.validateVoiceMemo(3.5, true);
    expect(validMemo.isValid).toBe(true);

    // Invalid voice memo (18s, exceeds 15s limit)
    const tooLongMemo = VoiceMemoRecorder.validateVoiceMemo(18.0, true);
    expect(tooLongMemo.isValid).toBe(false);
    expect(tooLongMemo.error?.includes('15s hard limit')).toBe(true);

    // Unconfirmed voice memo
    const unconfirmed = VoiceMemoRecorder.validateVoiceMemo(5.0, false);
    expect(unconfirmed.isValid).toBe(false);
  });

  it('should encrypt and decrypt chat media payload using X25519 ECDH + AES-256-GCM', () => {
    const aliceKeys = CryptoEngine.generateKeyPair();
    const bobKeys = CryptoEngine.generateKeyPair();

    const sampleMediaBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x01, 0x02, 0x03, 0x04]); // Sample WebP/Audio header

    // Alice encrypts for Bob
    const encryptedPkg = MediaPayloadSecurity.encryptMedia(sampleMediaBytes, bobKeys.publicKey);
    expect(encryptedPkg.ephemeralPublicKey.length).toBe(32);
    expect(encryptedPkg.iv.length).toBe(12);
    expect(encryptedPkg.ciphertextWithTag.length).toBeGreaterThan(sampleMediaBytes.length);

    // Bob decrypts with his private key
    const decryptedBytes = MediaPayloadSecurity.decryptMedia(encryptedPkg, bobKeys.privateKey);
    expect(Array.from(decryptedBytes)).toEqual(Array.from(sampleMediaBytes));
  });
});
