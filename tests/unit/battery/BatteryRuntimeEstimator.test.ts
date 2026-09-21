/**
 * Unit tests for BatteryRuntimeEstimator (Sprint C Task C.1)
 * Verifies accurate runtime projection and 5% Last-Gasp beacon trigger
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Survival Power Model
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { BatteryRuntimeEstimator } from '../../../src/core/battery/BatteryRuntimeEstimator';

describe('BatteryRuntimeEstimator (Sprint C Task C.1 Power HUD)', () => {
  it('should calculate estimated remaining hours and minutes under baseline load', () => {
    const estimate = BatteryRuntimeEstimator.estimateRuntime(78, false);

    expect(estimate.isCharging).toBe(false);
    expect(estimate.isCriticalLastGasp).toBe(false);
    expect(estimate.estimatedHours).toBeGreaterThan(35); // ~43 hours at 1.8%/hr
    expect(estimate.formattedRemaining.includes('78%')).toBe(true);
    expect(estimate.formattedRemaining.includes('ชม.')).toBe(true);
  });

  it('should sharply reduce remaining time when emergency flashlight or siren are engaged', () => {
    const baseline = BatteryRuntimeEstimator.estimateRuntime(50, false, false, false);
    const withTorch = BatteryRuntimeEstimator.estimateRuntime(50, false, true, false);
    const withAllHardware = BatteryRuntimeEstimator.estimateRuntime(50, false, true, true);

    expect(withTorch.estimatedHours).toBeLessThan(baseline.estimatedHours);
    expect(withAllHardware.estimatedHours).toBeLessThan(withTorch.estimatedHours);
  });

  it('should report unlimited status when phone is plugged into charger', () => {
    const estimate = BatteryRuntimeEstimator.estimateRuntime(12, true);

    expect(estimate.isCharging).toBe(true);
    expect(estimate.isCriticalLastGasp).toBe(false);
    expect(estimate.formattedRemaining.includes('กำลังชาร์จไฟ')).toBe(true);
  });

  it('should flag isCriticalLastGasp at 5% or below to trigger radio last-gasp beacon', () => {
    const safe = BatteryRuntimeEstimator.estimateRuntime(6, false);
    expect(safe.isCriticalLastGasp).toBe(false);

    const critical = BatteryRuntimeEstimator.estimateRuntime(5, false);
    expect(critical.isCriticalLastGasp).toBe(true);
    expect(critical.formattedRemaining.includes('Last-Gasp')).toBe(true);

    const dying = BatteryRuntimeEstimator.estimateRuntime(2, false);
    expect(dying.isCriticalLastGasp).toBe(true);
  });
});
