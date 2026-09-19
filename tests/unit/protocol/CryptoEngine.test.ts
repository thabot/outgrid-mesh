/**
 * Unit tests for CryptoEngine (E2EE X25519 + AES-256-GCM)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { CryptoEngine, SECURITY_OVERHEAD } from '../../../src/core/crypto/CryptoEngine';

describe('CryptoEngine (E2EE X25519 + AES-256-GCM)', () => {
  it('should establish mutual shared secret via X25519 ECDH', () => {
    const alice = CryptoEngine.generateKeyPair();
    const bob = CryptoEngine.generateKeyPair();

    const aliceShared = CryptoEngine.computeSharedSecret(alice.privateKey, bob.publicKey);
    const bobShared = CryptoEngine.computeSharedSecret(bob.privateKey, alice.publicKey);

    expect(aliceShared.length).toBe(32);
    expect(bobShared.length).toBe(32);
    expect(Array.from(aliceShared)).toEqual(Array.from(bobShared));
  });

  it('should encrypt and decrypt message with exact +28 bytes security overhead', () => {
    const alice = CryptoEngine.generateKeyPair();
    const bob = CryptoEngine.generateKeyPair();
    const sharedSecret = CryptoEngine.computeSharedSecret(alice.privateKey, bob.publicKey);

    const message = 'Emergency: Flood waters rising at Station 4!';
    const plaintext = new TextEncoder().encode(message);

    const encrypted = CryptoEngine.encrypt(plaintext, sharedSecret);

    // Exact +28 bytes security overhead check
    expect(encrypted.length).toBe(plaintext.length + SECURITY_OVERHEAD);

    const decrypted = CryptoEngine.decrypt(encrypted, sharedSecret);
    expect(new TextDecoder().decode(decrypted)).toBe(message);
  });

  it('should fail decryption if ciphertext or authentication tag is tampered with', () => {
    const alice = CryptoEngine.generateKeyPair();
    const bob = CryptoEngine.generateKeyPair();
    const sharedSecret = CryptoEngine.computeSharedSecret(alice.privateKey, bob.publicKey);

    const plaintext = new TextEncoder().encode('Confidential rescue coordinate');
    const encrypted = CryptoEngine.encrypt(plaintext, sharedSecret);

    // Tamper with one byte in the ciphertext
    encrypted[15] ^= 0xff;

    expect(() => CryptoEngine.decrypt(encrypted, sharedSecret)).toThrow();
  });

  it('should correctly produce 8-byte truncated public key hash', () => {
    const pair = CryptoEngine.generateKeyPair();
    const hash = CryptoEngine.computeKeyHash(pair.publicKey);
    expect(hash.length).toBe(8);
  });
});
