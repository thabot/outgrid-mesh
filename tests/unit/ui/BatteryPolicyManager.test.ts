/**
 * Unit tests for BatteryPolicyManager
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { BatteryPolicyManager, BatteryTier } from '../../../src/core/state/BatteryPolicyManager';

describe('BatteryPolicyManager (Adaptive Power Strategy)', () => {
  it('should grant FULL_POWER tier when battery > 50%', () => {
    const mgr = new BatteryPolicyManager(85);
    const policy = mgr.getPolicy();

    expect(policy.tier).toBe(BatteryTier.FULL_POWER);
    expect(policy.allowHighThroughputMedia).toBe(true);
    expect(policy.scanIntervalSec).toBe(60);
  });

  it('should scale down to BALANCED tier when battery is between 20% and 50%', () => {
    const mgr = new BatteryPolicyManager(35);
    const policy = mgr.getPolicy();

    expect(policy.tier).toBe(BatteryTier.BALANCED);
    expect(policy.allowHighThroughputMedia).toBe(false);
    expect(policy.scanIntervalSec).toBe(120);
  });

  it('should force DEEP_HIBERNATION tier when battery falls below 20%', () => {
    const mgr = new BatteryPolicyManager(15);
    const policy = mgr.getPolicy();

    expect(policy.tier).toBe(BatteryTier.DEEP_HIBERNATION);
    expect(policy.allowHighThroughputMedia).toBe(false);
    expect(policy.scanIntervalSec).toBe(300);
    expect(policy.uiGuidanceNotice.includes('วิกฤต')).toBe(true);
  });

  it('should override to FULL_POWER when plugged into charger even if low battery', () => {
    const mgr = new BatteryPolicyManager(10, true); // 10% but charging
    const policy = mgr.getPolicy();

    expect(policy.tier).toBe(BatteryTier.FULL_POWER);
    expect(policy.allowHighThroughputMedia).toBe(true);
  });
});
