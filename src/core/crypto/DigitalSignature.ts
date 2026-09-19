/**
 * Ed25519 Digital Signature & Anti-Spoofing Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha256.js';

export interface IEdKeyPair {
  privateKey: Uint8Array; // 32 Bytes
  publicKey: Uint8Array;  // 32 Bytes
}

export class DigitalSignature {
  /**
   * Generates a new Ed25519 signing keypair
   */
  public static generateKeyPair(): IEdKeyPair {
    const pair = ed25519.keygen();
    return { privateKey: pair.secretKey, publicKey: pair.publicKey };
  }

  /**
   * Signs a message using Ed25519 private key
   * Returns a 64-byte detached signature
   */
  public static sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
    return ed25519.sign(message, privateKey);
  }

  /**
   * Verifies an Ed25519 signature against the message and public key
   * Returns true if valid, false if invalid or forged
   */
  public static verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    if (signature.length !== 64 || publicKey.length !== 32) {
      return false;
    }
    try {
      return ed25519.verify(signature, message, publicKey);
    } catch {
      return false;
    }
  }

  /**
   * Computes an 8-byte authority fingerprint for fast filtering
   */
  public static computeFingerprint(publicKey: Uint8Array): Uint8Array {
    return sha256(publicKey).subarray(0, 8);
  }
}
