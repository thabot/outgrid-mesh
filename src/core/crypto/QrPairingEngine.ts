/**
 * Offline Dynamic QR Pairing Engine & 8-Digit Safety Numbers
 * Protocol: TOG v1.1 Out-of-Band Anti-MitM QR Exchange
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { sha256 } from '@noble/hashes/sha256.js';
import { DigitalSignature } from './DigitalSignature';

export const QR_MAGIC = 0x4f47; // ASCII 'OG' (OutGrid)
export const QR_VERSION = 1;
export const QR_MIN_PAYLOAD_SIZE = 2 + 1 + 1 + 32 + 32 + 8 + 1 + 64; // 141 Bytes (with 0-byte nickname)

export enum QrPayloadType {
  PEER_CONTACT = 0x01,
  RESCUER_VERIFIED = 0x02
}

export interface IQrPairingData {
  version: number;
  type: QrPayloadType;
  ed25519PublicKey: Uint8Array; // 32 Bytes
  x25519PublicKey: Uint8Array;  // 32 Bytes
  nonce: Uint8Array;            // 8 Bytes Ephemeral Nonce
  nickname: string;             // 0-16 Characters
  signature: Uint8Array;        // 64 Bytes Ed25519 Signature
}

export class QrPairingEngine {
  /**
   * Generates a binary QR payload buffer (141 - 157 Bytes)
   * Format:
   * [0-1]   Magic (0x4F47 "OG")
   * [2]     Version (1B)
   * [3]     Type (1B)
   * [4-35]  Ed25519 Signing Public Key (32B)
   * [36-67] X25519 Encryption Public Key (32B)
   * [68-75] Ephemeral Nonce (8B)
   * [76]    Nickname Length N (1B, 0-16)
   * [77..77+N-1] Nickname (UTF-8 bytes)
   * [77+N..77+N+63] Detached Ed25519 Signature (64B)
   */
  public static encodeBinaryPayload(
    ed25519PublicKey: Uint8Array,
    x25519PublicKey: Uint8Array,
    ed25519PrivateKey: Uint8Array,
    nickname: string,
    type: QrPayloadType = QrPayloadType.PEER_CONTACT,
    nonce?: Uint8Array
  ): Uint8Array {
    if (ed25519PublicKey.length !== 32) throw new Error('Invalid Ed25519 public key length');
    if (x25519PublicKey.length !== 32) throw new Error('Invalid X25519 public key length');
    if (ed25519PrivateKey.length !== 32) throw new Error('Invalid Ed25519 private key length');

    const cleanNickname = nickname.trim().slice(0, 16);
    const nickBytes = new TextEncoder().encode(cleanNickname);
    const nickLen = nickBytes.length;

    const actualNonce = nonce ?? crypto.getRandomValues(new Uint8Array(8));
    if (actualNonce.length !== 8) throw new Error('Nonce must be 8 bytes');

    // Data to sign: [Magic 2B] + [Ver 1B] + [Type 1B] + [Ed25519 32B] + [X25519 32B] + [Nonce 8B] + [NickLen 1B] + [Nick N]
    const headerSize = 2 + 1 + 1 + 32 + 32 + 8 + 1 + nickLen;
    const toSign = new Uint8Array(headerSize);
    const view = new DataView(toSign.buffer);

    view.setUint16(0, QR_MAGIC, false);
    view.setUint8(2, QR_VERSION);
    view.setUint8(3, type);
    toSign.set(ed25519PublicKey, 4);
    toSign.set(x25519PublicKey, 36);
    toSign.set(actualNonce, 68);
    view.setUint8(76, nickLen);
    if (nickLen > 0) {
      toSign.set(nickBytes, 77);
    }

    // Sign payload with owner's Ed25519 private key
    const signature = DigitalSignature.sign(toSign, ed25519PrivateKey);

    // Full packet = toSign + 64B signature
    const fullPayload = new Uint8Array(headerSize + 64);
    fullPayload.set(toSign, 0);
    fullPayload.set(signature, headerSize);

    return fullPayload;
  }

  /**
   * Decodes and validates a raw QR binary payload
   * Throws an error if magic, version or cryptographic signature is invalid
   */
  public static decodeBinaryPayload(payload: Uint8Array): IQrPairingData {
    if (payload.length < 4) {
      throw new Error(`QR payload too short: ${payload.length} bytes`);
    }

    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const magic = view.getUint16(0, false);
    if (magic !== QR_MAGIC) {
      throw new Error(`Invalid QR Magic: 0x${magic.toString(16).toUpperCase()}`);
    }

    const version = view.getUint8(2);
    if (version !== QR_VERSION) {
      throw new Error(`Unsupported QR Version: ${version}`);
    }

    if (payload.length < QR_MIN_PAYLOAD_SIZE) {
      throw new Error(`QR payload too short: ${payload.length} bytes < ${QR_MIN_PAYLOAD_SIZE}`);
    }

    const type = view.getUint8(3) as QrPayloadType;
    const ed25519PublicKey = payload.slice(4, 36);
    const x25519PublicKey = payload.slice(36, 68);
    const nonce = payload.slice(68, 76);
    const nickLen = view.getUint8(76);

    const expectedTotal = 77 + nickLen + 64;
    if (payload.length !== expectedTotal) {
      throw new Error(`QR payload length mismatch: expected ${expectedTotal}, got ${payload.length}`);
    }

    const nickBytes = payload.slice(77, 77 + nickLen);
    const nickname = new TextDecoder().decode(nickBytes);

    const signature = payload.slice(77 + nickLen, 77 + nickLen + 64);
    const signedData = payload.slice(0, 77 + nickLen);

    const isValidSig = DigitalSignature.verify(signature, signedData, ed25519PublicKey);
    if (!isValidSig) {
      throw new Error('Forged or corrupted QR signature: verification failed');
    }

    return {
      version,
      type,
      ed25519PublicKey,
      x25519PublicKey,
      nonce,
      nickname,
      signature
    };
  }

  /**
   * Computes an 8-digit radio safety number between two peers
   * Split into 2 groups of 4 digits: e.g. "[ 4821 ] [ 9035 ]"
   * Lexicographically orders keys so that both parties compute the EXACT same digits
   */
  public static computeSafetyNumber(
    keyA: Uint8Array,
    keyB: Uint8Array
  ): { formatted: string; group1: string; group2: string; rawNumber: number } {
    if (keyA.length !== 32 || keyB.length !== 32) {
      throw new Error('Public keys must be 32 bytes to compute safety number');
    }

    // Lexicographical ordering for symmetry
    let first = keyA;
    let second = keyB;
    for (let i = 0; i < 32; i++) {
      if (keyA[i] < keyB[i]) {
        first = keyA;
        second = keyB;
        break;
      } else if (keyA[i] > keyB[i]) {
        first = keyB;
        second = keyA;
        break;
      }
    }

    const combined = new Uint8Array(64);
    combined.set(first, 0);
    combined.set(second, 32);

    const digest = sha256(combined);
    const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);

    // Derive 8-digit number (0 to 99,999,999)
    const uint32Val = view.getUint32(0, false);
    const rawNumber = uint32Val % 100000000;
    const padded = rawNumber.toString().padStart(8, '0');

    const group1 = padded.slice(0, 4);
    const group2 = padded.slice(4, 8);
    const formatted = `[ ${group1} ] [ ${group2} ]`;

    return {
      formatted,
      group1,
      group2,
      rawNumber
    };
  }
}
