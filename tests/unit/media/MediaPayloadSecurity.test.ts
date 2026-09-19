/**
 * Unit tests for MediaPayloadSecurity
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { MediaPayloadSecurity } from '../../../src/core/media/MediaPayloadSecurity';
import { CryptoEngine } from '../../../src/core/crypto/CryptoEngine';

describe('MediaPayloadSecurity', () => {
  it('should encrypt and decrypt media bytes with authentic fidelity', () => {
    const keyPair = CryptoEngine.generateKeyPair();
    const originalMedia = new Uint8Array(4096);
    for (let i = 0; i < originalMedia.length; i++) {
      originalMedia[i] = (i * 13) % 256;
    }

    // Encrypt
    const encryptedPkg = MediaPayloadSecurity.encryptMedia(originalMedia, keyPair.publicKey);
    expect(encryptedPkg.ephemeralPublicKey.length).toBe(32);
    expect(encryptedPkg.iv.length).toBe(12);
    expect(encryptedPkg.ciphertextWithTag.length).toBe(originalMedia.length + 16);

    // Decrypt
    const decryptedMedia = MediaPayloadSecurity.decryptMedia(encryptedPkg, keyPair.privateKey);
    expect(decryptedMedia).toEqual(originalMedia);
  });

  it('should fail decryption if ciphertext is tampered with', () => {
    const keyPair = CryptoEngine.generateKeyPair();
    const originalMedia = new Uint8Array([10, 20, 30, 40, 50]);

    const encryptedPkg = MediaPayloadSecurity.encryptMedia(originalMedia, keyPair.publicKey);
    encryptedPkg.ciphertextWithTag[0] ^= 0xff; // Flip bits

    expect(() => {
      MediaPayloadSecurity.decryptMedia(encryptedPkg, keyPair.privateKey);
    }).toThrow();
  });
});
