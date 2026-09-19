/**
 * End-to-End Encryption Engine (E2EE)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 E2EE Wire Security
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { x25519 } from '@noble/curves/ed25519.js';
import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha256.js';

export const IV_LENGTH = 12;  // 12 Bytes for AES-GCM
export const TAG_LENGTH = 16; // 16 Bytes Auth Tag
export const SECURITY_OVERHEAD = IV_LENGTH + TAG_LENGTH; // Strict 28 Bytes

export interface IKeyPair {
  privateKey: Uint8Array; // 32 Bytes
  publicKey: Uint8Array;  // 32 Bytes
}

export class CryptoEngine {
  /**
   * Generates a new X25519 keypair
   */
  public static generateKeyPair(): IKeyPair {
    const pair = x25519.keygen();
    return { privateKey: pair.secretKey, publicKey: pair.publicKey };
  }

  /**
   * Computes truncated 8-byte hash of a public key for wire efficiency
   */
  public static computeKeyHash(publicKey: Uint8Array): Uint8Array {
    const hash = sha256(publicKey);
    return hash.subarray(0, 8);
  }

  /**
   * Computes a 32-byte shared secret using X25519 ECDH + SHA-256 KDF
   */
  public static computeSharedSecret(myPrivateKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array {
    const sharedPoint = x25519.getSharedSecret(myPrivateKey, theirPublicKey);
    return sha256(sharedPoint);
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * Output: [12-byte IV] + [Ciphertext] + [16-byte Auth Tag]
   * Overhead: Exactly 28 Bytes
   */
  public static encrypt(
    plaintext: Uint8Array,
    sharedKey: Uint8Array,
    additionalData?: Uint8Array
  ): Uint8Array {
    // Generate 12-byte cryptographically secure random nonce / IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const aes = gcm(sharedKey, iv, additionalData);
    const ciphertextWithTag = aes.encrypt(plaintext);

    const result = new Uint8Array(IV_LENGTH + ciphertextWithTag.length);
    result.set(iv, 0);
    result.set(ciphertextWithTag, IV_LENGTH);

    return result;
  }

  /**
   * Decrypts AES-256-GCM payload with authentication tag validation
   * Throws error if tag fails or payload is tampered
   */
  public static decrypt(
    encryptedPayload: Uint8Array,
    sharedKey: Uint8Array,
    additionalData?: Uint8Array
  ): Uint8Array {
    if (encryptedPayload.length < SECURITY_OVERHEAD) {
      throw new Error(`Encrypted payload too short: ${encryptedPayload.length} < ${SECURITY_OVERHEAD}`);
    }

    const iv = encryptedPayload.subarray(0, IV_LENGTH);
    const ciphertextWithTag = encryptedPayload.subarray(IV_LENGTH);

    const aes = gcm(sharedKey, iv, additionalData);
    return aes.decrypt(ciphertextWithTag);
  }
}
