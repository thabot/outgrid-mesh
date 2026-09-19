/**
 * Unit tests for DigitalSignature (Ed25519 Sign/Verify)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { DigitalSignature } from '../../../src/core/crypto/DigitalSignature';

describe('DigitalSignature (Ed25519 Anti-Spoofing Engine)', () => {
  it('should sign and verify valid emergency broadcast feed', () => {
    const authority = DigitalSignature.generateKeyPair();
    const alertMessage = new TextEncoder().encode('CRISIS_ALERT: Evacuate zone H3-88654c5525fffff immediately!');

    const signature = DigitalSignature.sign(alertMessage, authority.privateKey);
    expect(signature.length).toBe(64);

    const isValid = DigitalSignature.verify(signature, alertMessage, authority.publicKey);
    expect(isValid).toBe(true);
  });

  it('should reject signature if message has been altered (spoofing guard)', () => {
    const authority = DigitalSignature.generateKeyPair();
    const originalMessage = new TextEncoder().encode('Flood water level 1.5m');
    const forgedMessage = new TextEncoder().encode('Flood water level 0.0m - all safe');

    const signature = DigitalSignature.sign(originalMessage, authority.privateKey);

    const isValid = DigitalSignature.verify(signature, forgedMessage, authority.publicKey);
    expect(isValid).toBe(false);
  });

  it('should reject signature if signed with different key', () => {
    const authority = DigitalSignature.generateKeyPair();
    const attacker = DigitalSignature.generateKeyPair();
    const message = new TextEncoder().encode('Official rescue instruction');

    const fakeSignature = DigitalSignature.sign(message, attacker.privateKey);

    const isValid = DigitalSignature.verify(fakeSignature, message, authority.publicKey);
    expect(isValid).toBe(false);
  });

  it('should compute 8-byte authority fingerprint correctly', () => {
    const authority = DigitalSignature.generateKeyPair();
    const fingerprint = DigitalSignature.computeFingerprint(authority.publicKey);
    expect(fingerprint.length).toBe(8);
  });
});
