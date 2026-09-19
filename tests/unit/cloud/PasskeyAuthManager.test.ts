/**
 * Unit tests for PasskeyAuthManager
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { PasskeyAuthManager } from '../../../cloudflare/workers/passkeyAuth';

describe('PasskeyAuthManager (FIDO2 WebAuthn Verification)', () => {
  let passkeyMgr: PasskeyAuthManager;

  beforeEach(() => {
    passkeyMgr = new PasskeyAuthManager();
  });

  it('should generate challenge and verify valid authentication response', () => {
    const userId = 'responder-thai-01';
    const credId = 'cred-fido2-abc';

    passkeyMgr.registerCredential({
      credentialId: credId,
      userId,
      publicKeyHex: 'mock-public-key',
      responderOrg: 'ปภ. เขต 1 (เชียงใหม่)',
      counter: 0,
    });

    const challengeObj = passkeyMgr.createChallenge(userId);
    expect(challengeObj.challenge.length).toBe(64); // 32-byte hex

    const ok = passkeyMgr.verifyAuthentication(credId, userId, challengeObj.challenge, true);
    expect(ok).toBe(true);

    const cred = passkeyMgr.getCredential(credId);
    expect(cred?.counter).toBe(1);
  });

  it('should reject replay or mismatched challenge', () => {
    const userId = 'responder-thai-02';
    const credId = 'cred-fido2-xyz';

    passkeyMgr.registerCredential({
      credentialId: credId,
      userId,
      publicKeyHex: 'mock-public-key',
      responderOrg: 'มูลนิธิร่วมกตัญญู',
      counter: 0,
    });

    passkeyMgr.createChallenge(userId);

    // Mismatched challenge
    const failed = passkeyMgr.verifyAuthentication(credId, userId, 'wrong-challenge-string', true);
    expect(failed).toBe(false);
  });
});
