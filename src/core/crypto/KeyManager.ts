/**
 * Zero-Mental-Load Master Identity KeyManager
 * Protocol: TOG v1.1 Identity & Wire Security
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha256.js';
import type { IKeypairBundle } from '../interfaces/IKeystoreDriver';

export class KeyManager {
  /**
   * Generates a disaster-resilient master identity keypair bundle
   * Uses 256-bit Hardware CSPRNG entropy (Zero-Mental-Load: No 12-word seed required)
   */
  public static generateMasterIdentity(): IKeypairBundle {
    // 1. Generate Ed25519 Signing Keypair (32B private, 32B public)
    const edKeys = ed25519.keygen();

    // 2. Generate X25519 Encryption Keypair (32B private, 32B public)
    const xKeys = x25519.keygen();

    // 3. Derive 8-byte Public Key Hash from Ed25519 Public Key
    const pubkeyHash = sha256(edKeys.publicKey).subarray(0, 8);

    // 4. Derive 64-bit uint BigInt Node ID from truncated hash
    const view = new DataView(pubkeyHash.buffer, pubkeyHash.byteOffset, 8);
    const nodeId = view.getBigUint64(0, false);

    return {
      ed25519PrivateKey: edKeys.secretKey,
      ed25519PublicKey: edKeys.publicKey,
      x25519PrivateKey: xKeys.secretKey,
      x25519PublicKey: xKeys.publicKey,
      nodeId,
      pubkeyHash
    };
  }

  /**
   * Derives truncated 8-byte hash of any public key (Ed25519 or X25519)
   */
  public static computeKeyHash(publicKey: Uint8Array): Uint8Array {
    return sha256(publicKey).subarray(0, 8);
  }

  /**
   * Computes 64-bit Node ID as bigint from public key
   */
  public static computeNodeId(publicKey: Uint8Array): bigint {
    const hash = this.computeKeyHash(publicKey);
    const view = new DataView(hash.buffer, hash.byteOffset, 8);
    return view.getBigUint64(0, false);
  }

  /**
   * Reconstitutes an IKeypairBundle from existing raw private keys
   */
  public static importFromPrivateKeys(
    ed25519PrivateKey: Uint8Array,
    x25519PrivateKey: Uint8Array
  ): IKeypairBundle {
    if (ed25519PrivateKey.length !== 32) {
      throw new Error(`Invalid Ed25519 private key length: ${ed25519PrivateKey.length} != 32`);
    }
    if (x25519PrivateKey.length !== 32) {
      throw new Error(`Invalid X25519 private key length: ${x25519PrivateKey.length} != 32`);
    }

    const edPublicKey = ed25519.getPublicKey(ed25519PrivateKey);
    const xPublicKey = x25519.getPublicKey(x25519PrivateKey);
    const pubkeyHash = sha256(edPublicKey).subarray(0, 8);
    const view = new DataView(pubkeyHash.buffer, pubkeyHash.byteOffset, 8);
    const nodeId = view.getBigUint64(0, false);

    return {
      ed25519PrivateKey,
      ed25519PublicKey: edPublicKey,
      x25519PrivateKey,
      x25519PublicKey: xPublicKey,
      nodeId,
      pubkeyHash
    };
  }
}
