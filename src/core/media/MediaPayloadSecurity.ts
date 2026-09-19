/**
 * Media Payload Security - E2EE Hybrid Media Encryption (X25519 ECDH + AES-256-GCM)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Encrypted Stream
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { CryptoEngine } from '../crypto/CryptoEngine';

export interface IEncryptedMediaPackage {
  ephemeralPublicKey: Uint8Array; // 32 bytes
  iv: Uint8Array;                 // 12 bytes
  ciphertextWithTag: Uint8Array;  // ciphertext + 16 bytes auth tag
}

export class MediaPayloadSecurity {
  /**
   * Encrypts media stream payload for a recipient node
   */
  public static encryptMedia(
    mediaBytes: Uint8Array,
    recipientPublicKey: Uint8Array
  ): IEncryptedMediaPackage {
    // 1. Generate ephemeral key pair
    const ephemeralKey = CryptoEngine.generateKeyPair();

    // 2. Compute shared secret
    const sharedSecret = CryptoEngine.computeSharedSecret(ephemeralKey.privateKey, recipientPublicKey);

    // 3. Encrypt payload using AES-256-GCM (returns IV + ciphertextWithTag)
    const encryptedBytes = CryptoEngine.encrypt(mediaBytes, sharedSecret);

    const iv = encryptedBytes.slice(0, 12);
    const ciphertextWithTag = encryptedBytes.slice(12);

    return {
      ephemeralPublicKey: ephemeralKey.publicKey,
      iv,
      ciphertextWithTag,
    };
  }

  /**
   * Decrypts media stream payload using local private key
   */
  public static decryptMedia(
    pkg: IEncryptedMediaPackage,
    recipientPrivateKey: Uint8Array
  ): Uint8Array {
    // 1. Compute shared secret
    const sharedSecret = CryptoEngine.computeSharedSecret(recipientPrivateKey, pkg.ephemeralPublicKey);

    // 2. Combine IV + ciphertextWithTag
    const combined = new Uint8Array(pkg.iv.length + pkg.ciphertextWithTag.length);
    combined.set(pkg.iv, 0);
    combined.set(pkg.ciphertextWithTag, pkg.iv.length);

    // 3. Decrypt with CryptoEngine
    return CryptoEngine.decrypt(combined, sharedSecret);
  }
}
