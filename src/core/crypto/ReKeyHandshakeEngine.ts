/**
 * Re-Key Handshake & Birational Curve Migration Engine
 * Protocol: TOG v1.1 Re-Key Protocol (0x52 "R") & Anti-Replay Guard
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { DigitalSignature } from './DigitalSignature';

export const REKEY_MAGIC = 0x52; // ASCII 'R' (0x52)
export const MAX_REPLAY_CACHE_SIZE = 1024;

export interface IReKeyPacket {
  magic: number;            // 0x52 (1B)
  counter: bigint;          // Monotonic sequence counter (8B)
  oldEd25519PublicKey: Uint8Array; // 32B
  newX25519PublicKey: Uint8Array;  // 32B
  signature: Uint8Array;    // 64B Ed25519 signature over (magic + counter + oldKey + newKey)
}

export class ReKeyHandshakeEngine {
  private static replayCache: Set<string> = new Set();
  private static replayOrder: string[] = [];

  /**
   * Birational curve conversion from Ed25519 Edwards point to X25519 Montgomery point
   * Uses @noble/curves ed25519.utils.toMontgomery
   */
  public static edwardsToMontgomery(ed25519PublicKey: Uint8Array): Uint8Array {
    if (ed25519PublicKey.length !== 32) {
      throw new Error('Ed25519 public key must be exactly 32 bytes');
    }
    return ed25519.utils.toMontgomery(ed25519PublicKey);
  }

  /**
   * Constructs and signs a Re-Key Migration Packet
   * Total wire size: 1B + 8B + 32B + 32B + 64B = 137 Bytes
   */
  public static createReKeyPacket(
    counter: bigint,
    oldEd25519PrivateKey: Uint8Array,
    oldEd25519PublicKey: Uint8Array,
    newX25519PublicKey: Uint8Array
  ): Uint8Array {
    if (oldEd25519PrivateKey.length !== 32 || oldEd25519PublicKey.length !== 32 || newX25519PublicKey.length !== 32) {
      throw new Error('Keys must be 32 bytes');
    }

    const payloadToSign = new Uint8Array(1 + 8 + 32 + 32);
    const view = new DataView(payloadToSign.buffer);

    view.setUint8(0, REKEY_MAGIC);
    view.setBigUint64(1, counter, false);
    payloadToSign.set(oldEd25519PublicKey, 9);
    payloadToSign.set(newX25519PublicKey, 41);

    const signature = DigitalSignature.sign(payloadToSign, oldEd25519PrivateKey);

    const packet = new Uint8Array(payloadToSign.length + 64);
    packet.set(payloadToSign, 0);
    packet.set(signature, payloadToSign.length);

    return packet;
  }

  /**
   * Verifies a Re-Key packet and guards against replay attacks using a 1,024-entry LRU cache
   */
  public static verifyReKeyPacket(packet: Uint8Array): {
    valid: boolean;
    counter: bigint;
    oldEd25519PublicKey: Uint8Array;
    newX25519PublicKey: Uint8Array;
  } {
    if (packet.length !== 1 + 8 + 32 + 32 + 64) {
      return { valid: false, counter: 0n, oldEd25519PublicKey: new Uint8Array(0), newX25519PublicKey: new Uint8Array(0) };
    }

    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const magic = view.getUint8(0);
    if (magic !== REKEY_MAGIC) {
      return { valid: false, counter: 0n, oldEd25519PublicKey: new Uint8Array(0), newX25519PublicKey: new Uint8Array(0) };
    }

    const counter = view.getBigUint64(1, false);
    const oldEd25519PublicKey = packet.slice(9, 41);
    const newX25519PublicKey = packet.slice(41, 73);
    const signature = packet.slice(73, 137);
    const signedData = packet.slice(0, 73);

    // Anti-replay cache check: key = hex(oldKey) + ":" + counter
    const oldKeyHex = Array.from(oldEd25519PublicKey).map(b => b.toString(16).padStart(2, '0')).join('');
    const replayKey = `${oldKeyHex}:${counter.toString()}`;

    if (this.replayCache.has(replayKey)) {
      // Detected replay attack!
      return { valid: false, counter, oldEd25519PublicKey, newX25519PublicKey };
    }

    // Verify cryptographic signature
    const isValidSig = DigitalSignature.verify(signature, signedData, oldEd25519PublicKey);
    if (!isValidSig) {
      return { valid: false, counter, oldEd25519PublicKey, newX25519PublicKey };
    }

    // Record in 1,024-entry LRU cache
    if (this.replayOrder.length >= MAX_REPLAY_CACHE_SIZE) {
      const oldest = this.replayOrder.shift();
      if (oldest) this.replayCache.delete(oldest);
    }
    this.replayCache.add(replayKey);
    this.replayOrder.push(replayKey);

    return {
      valid: true,
      counter,
      oldEd25519PublicKey,
      newX25519PublicKey
    };
  }

  /**
   * Clears the anti-replay cache (for test suites)
   */
  public static clearReplayCache(): void {
    this.replayCache.clear();
    this.replayOrder = [];
  }
}
