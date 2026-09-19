/**
 * Unit tests for DutyCycleController (Battery-Aware Duty Cycle)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { DutyCycleController, BatteryTier } from '../../../src/core/ble/DutyCycleController';

describe('DutyCycleController (Scan/Sleep Windows by Battery Tier)', () => {
  it('should set Normal Duty Cycle (Scan 5s / Sleep 55s) when battery > 50%', () => {
    const duty = DutyCycleController.getDutyCycle(80);
    expect(duty.tier).toBe(BatteryTier.TIER_NORMAL);
    expect(duty.scanDurationMs).toBe(5000);
    expect(duty.sleepDurationMs).toBe(55000);
  });

  it('should set Eco Mode (Scan 3s / Sleep 120s) when battery is 20% - 50%', () => {
    const duty = DutyCycleController.getDutyCycle(35);
    expect(duty.tier).toBe(BatteryTier.TIER_ECO);
    expect(duty.scanDurationMs).toBe(3000);
    expect(duty.sleepDurationMs).toBe(120000);
  });

  it('should set Deep Sleep Hibernation (Scan 2s / Sleep 300s) when battery < 20%', () => {
    const duty = DutyCycleController.getDutyCycle(12);
    expect(duty.tier).toBe(BatteryTier.TIER_DEEP_SLEEP);
    expect(duty.scanDurationMs).toBe(2000);
    expect(duty.sleepDurationMs).toBe(300000);
  });
});
