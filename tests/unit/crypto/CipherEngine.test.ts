/**
 * Unit tests for CipherEngine & HKDF (Phase 3 Task 3.2)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { CipherEngine, SECURITY_OVERHEAD, E2EE_HKDF_INFO } from '../../../src/core/crypto/CipherEngine';

describe('CipherEngine (Phase 3 Task 3.2 E2EE Direct Messaging Engine)', () => {
  it('should derive mutual 32-byte session key via HKDF-SHA256 with "TOG-v1.1-E2EE-Direct"', () => {
    const alice = CipherEngine.generateKeyPair();
    const bob = CipherEngine.generateKeyPair();
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    const aliceSession = CipherEngine.deriveSessionKey(alice.privateKey, bob.publicKey, salt, E2EE_HKDF_INFO);
    const bobSession = CipherEngine.deriveSessionKey(bob.privateKey, alice.publicKey, salt, E2EE_HKDF_INFO);

    expect(aliceSession.length).toBe(32);
    expect(bobSession.length).toBe(32);
    expect(Array.from(aliceSession)).toEqual(Array.from(bobSession));
  });

  it('should encrypt and decrypt with exact 28 bytes overhead and AAD binding', () => {
    const alice = CipherEngine.generateKeyPair();
    const bob = CipherEngine.generateKeyPair();
    const sessionKey = CipherEngine.deriveSessionKey(alice.privateKey, bob.publicKey);

    const plaintext = new TextEncoder().encode('SOS Medical Kit Needed at Shelter Alpha');
    const aad = new TextEncoder().encode('MSG-ID-998811');

    const encrypted = CipherEngine.encrypt(plaintext, sessionKey, aad);
    expect(encrypted.length).toBe(plaintext.length + SECURITY_OVERHEAD);

    // Decrypt with correct AAD
    const decrypted = CipherEngine.decrypt(encrypted, sessionKey, aad);
    expect(new TextDecoder().decode(decrypted)).toBe('SOS Medical Kit Needed at Shelter Alpha');

    // Decrypt with altered AAD should fail (tamper proof)
    const alteredAad = new TextEncoder().encode('MSG-ID-998812');
    expect(() => CipherEngine.decrypt(encrypted, sessionKey, alteredAad)).toThrow();
  });

  it('should reject tampered ciphertext or truncated payload', () => {
    const alice = CipherEngine.generateKeyPair();
    const bob = CipherEngine.generateKeyPair();
    const sessionKey = CipherEngine.deriveSessionKey(alice.privateKey, bob.publicKey);

    const plaintext = new TextEncoder().encode('Secret coordinate');
    const encrypted = CipherEngine.encrypt(plaintext, sessionKey);

    // Corrupt one byte in ciphertext
    encrypted[14] ^= 0x01;
    expect(() => CipherEngine.decrypt(encrypted, sessionKey)).toThrow();

    // Payload shorter than 28 bytes
    const shortPayload = new Uint8Array(20);
    expect(() => CipherEngine.decrypt(shortPayload, sessionKey)).toThrow('Encrypted payload too short');
  });
});
