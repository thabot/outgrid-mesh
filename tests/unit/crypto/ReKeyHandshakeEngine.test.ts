/**
 * Unit tests for ReKeyHandshakeEngine (Phase 3 Task 3.6)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { ReKeyHandshakeEngine, REKEY_MAGIC } from '../../../src/core/crypto/ReKeyHandshakeEngine';
import { KeyManager } from '../../../src/core/crypto/KeyManager';

describe('ReKeyHandshakeEngine (Phase 3 Task 3.6 Birational Migration & Anti-Replay)', () => {
  beforeEach(() => {
    ReKeyHandshakeEngine.clearReplayCache();
  });

  it('should perform birational curve conversion from Ed25519 to X25519 Montgomery point', () => {
    const identity = KeyManager.generateMasterIdentity();
    const montgomeryPoint = ReKeyHandshakeEngine.edwardsToMontgomery(identity.ed25519PublicKey);

    expect(montgomeryPoint.length).toBe(32);
    expect(montgomeryPoint).toBeInstanceOf(Uint8Array);
  });

  it('should create and verify valid Re-Key migration packet (0x52 "R")', () => {
    const oldIdentity = KeyManager.generateMasterIdentity();
    const newIdentity = KeyManager.generateMasterIdentity();
    const counter = 1001n;

    const packet = ReKeyHandshakeEngine.createReKeyPacket(
      counter,
      oldIdentity.ed25519PrivateKey,
      oldIdentity.ed25519PublicKey,
      newIdentity.x25519PublicKey
    );

    expect(packet.length).toBe(137); // 1B + 8B + 32B + 32B + 64B = 137B
    expect(packet[0]).toBe(REKEY_MAGIC);

    const verification = ReKeyHandshakeEngine.verifyReKeyPacket(packet);
    expect(verification.valid).toBe(true);
    expect(verification.counter).toBe(counter);
    expect(Array.from(verification.oldEd25519PublicKey)).toEqual(Array.from(oldIdentity.ed25519PublicKey));
    expect(Array.from(verification.newX25519PublicKey)).toEqual(Array.from(newIdentity.x25519PublicKey));
  });

  it('should detect and reject replayed packet via anti-replay cache', () => {
    const oldIdentity = KeyManager.generateMasterIdentity();
    const newIdentity = KeyManager.generateMasterIdentity();
    const counter = 5002n;

    const packet = ReKeyHandshakeEngine.createReKeyPacket(
      counter,
      oldIdentity.ed25519PrivateKey,
      oldIdentity.ed25519PublicKey,
      newIdentity.x25519PublicKey
    );

    // First presentation should be valid
    const firstAttempt = ReKeyHandshakeEngine.verifyReKeyPacket(packet);
    expect(firstAttempt.valid).toBe(true);

    // Replay presentation with same counter and key should be rejected
    const replayAttempt = ReKeyHandshakeEngine.verifyReKeyPacket(packet);
    expect(replayAttempt.valid).toBe(false);
  });

  it('should reject tampered or forged Re-Key packet', () => {
    const oldIdentity = KeyManager.generateMasterIdentity();
    const newIdentity = KeyManager.generateMasterIdentity();

    const packet = ReKeyHandshakeEngine.createReKeyPacket(
      1n,
      oldIdentity.ed25519PrivateKey,
      oldIdentity.ed25519PublicKey,
      newIdentity.x25519PublicKey
    );

    // Tamper with new key inside payload
    packet[50] ^= 0x55;

    const result = ReKeyHandshakeEngine.verifyReKeyPacket(packet);
    expect(result.valid).toBe(false);
  });
});
