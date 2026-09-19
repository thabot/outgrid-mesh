/**
 * Unit tests for QrPairingEngine (Phase 3 Task 3.3)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { QrPairingEngine, QrPayloadType, QR_MAGIC, QR_VERSION, QR_MIN_PAYLOAD_SIZE } from '../../../src/core/crypto/QrPairingEngine';
import { KeyManager } from '../../../src/core/crypto/KeyManager';

describe('QrPairingEngine (Phase 3 Task 3.3 Offline QR Code & 8-Digit Safety Numbers)', () => {
  it('should encode and decode binary QR payload with detached signature verification', () => {
    const alice = KeyManager.generateMasterIdentity();
    const nickname = 'Alice-Rescue';

    const encoded = QrPairingEngine.encodeBinaryPayload(
      alice.ed25519PublicKey,
      alice.x25519PublicKey,
      alice.ed25519PrivateKey,
      nickname,
      QrPayloadType.RESCUER_VERIFIED
    );

    // Verify compact binary frame size (141 - 157 bytes)
    expect(encoded.length).toBeGreaterThanOrEqual(QR_MIN_PAYLOAD_SIZE);
    expect(encoded.length).toBeLessThanOrEqual(160);

    const decoded = QrPairingEngine.decodeBinaryPayload(encoded);
    expect(decoded.version).toBe(QR_VERSION);
    expect(decoded.type).toBe(QrPayloadType.RESCUER_VERIFIED);
    expect(decoded.nickname).toBe(nickname);
    expect(Array.from(decoded.ed25519PublicKey)).toEqual(Array.from(alice.ed25519PublicKey));
    expect(Array.from(decoded.x25519PublicKey)).toEqual(Array.from(alice.x25519PublicKey));
    expect(decoded.signature.length).toBe(64);
  });

  it('should reject QR payload with tampered public key or forged signature', () => {
    const alice = KeyManager.generateMasterIdentity();
    const encoded = QrPairingEngine.encodeBinaryPayload(
      alice.ed25519PublicKey,
      alice.x25519PublicKey,
      alice.ed25519PrivateKey,
      'Alice'
    );

    // Tamper with one byte of the X25519 public key
    encoded[40] ^= 0xff;

    expect(() => QrPairingEngine.decodeBinaryPayload(encoded)).toThrow('Forged or corrupted QR signature');
  });

  it('should reject invalid magic number or unsupported version', () => {
    const invalidBuf = new Uint8Array(150);
    invalidBuf[0] = 0x00;
    invalidBuf[1] = 0x00;

    expect(() => QrPairingEngine.decodeBinaryPayload(invalidBuf)).toThrow('Invalid QR Magic');
  });

  it('should compute identical symmetric 8-digit safety numbers regardless of scan order', () => {
    const alice = KeyManager.generateMasterIdentity();
    const bob = KeyManager.generateMasterIdentity();

    // Alice scans Bob
    const aliceResult = QrPairingEngine.computeSafetyNumber(alice.x25519PublicKey, bob.x25519PublicKey);
    // Bob scans Alice
    const bobResult = QrPairingEngine.computeSafetyNumber(bob.x25519PublicKey, alice.x25519PublicKey);

    expect(aliceResult.formatted).toBe(bobResult.formatted);
    expect(aliceResult.group1).toBe(bobResult.group1);
    expect(aliceResult.group2).toBe(bobResult.group2);
    expect(aliceResult.rawNumber).toBe(bobResult.rawNumber);

    // Format should match "[ XXXX ] [ XXXX ]"
    expect(aliceResult.formatted).toMatch(/^\[ \d{4} \] \[ \d{4} \]$/);
  });
});
