/**
 * Unit tests for AuthManager & Guest Parity
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { AuthManager, UserRole } from '../../../src/core/auth/AuthManager';

describe('AuthManager & Guest Parity (100% Emergency Accessibility)', () => {
  it('should initialize unauthenticated user as Guest with full life-saving capabilities', () => {
    const guestAuth = new AuthManager();
    expect(guestAuth.isGuest()).toBe(true);
    expect(guestAuth.isResponder()).toBe(false);

    // Guaranteed 100% Parity on Life-saving features
    expect(guestAuth.canAccessFeature('ONE_TAP_SOS')).toBe(true);
    expect(guestAuth.canAccessFeature('OFFLINE_MAP')).toBe(true);
    expect(guestAuth.canAccessFeature('DIRECT_CHAT')).toBe(true);

    // Admin coordination restricted
    expect(guestAuth.canAccessFeature('COORDINATION_DASHBOARD')).toBe(false);
  });

  it('should upgrade to Verified Responder upon valid credential', () => {
    const auth = new AuthManager();
    const fakeCert = new Uint8Array(64).fill(0x07);

    const success = auth.verifyResponder('ศูนย์กู้ภัยสว่างบริบูรณ์ (Pattaya Rescue)', fakeCert);
    expect(success).toBe(true);
    expect(auth.isGuest()).toBe(false);
    expect(auth.isResponder()).toBe(true);
    expect(auth.getProfile().badge).toBe('ศูนย์กู้ภัยสว่างบริบูรณ์ (Pattaya Rescue)');
    expect(auth.canAccessFeature('COORDINATION_DASHBOARD')).toBe(true);
  });
});
