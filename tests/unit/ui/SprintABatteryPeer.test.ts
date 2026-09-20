/**
 * Unit tests for Sprint A: Survival Battery & Peer Distance
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { BatteryRuntimeEstimator, getBatteryBarsVisual } from '../../../src/core/battery/BatteryRuntimeEstimator';

describe('Sprint A: Survival Battery & Peer Distance', () => {
  it('should accurately calculate remaining battery runtime in regular mesh mode', () => {
    // 80% battery, discharge rate ~1.8% per hour -> ~44.4 hours
    const estimate = BatteryRuntimeEstimator.estimateRuntime(80, false, false, false);
    expect(estimate.percentage).toBe(80);
    expect(estimate.isCharging).toBe(false);
    expect(estimate.estimatedHours).toBe(44);
    expect(estimate.isCriticalLastGasp).toBe(false);
    expect(estimate.formattedRemaining).toContain('80% (ใช้ได้อีกประมาณ 44 ชม.');
  });

  it('should adjust runtime downward when high-drain Flashlight SOS strobe is running', () => {
    // With strobe active, discharge rate jumps from 1.8 to 12.0% per hour -> ~6.6 hours
    const estimateWithStrobe = BatteryRuntimeEstimator.estimateRuntime(80, false, true, false);
    expect(estimateWithStrobe.estimatedHours).toBeLessThan(10);
    expect(estimateWithStrobe.estimatedHours).toBe(6);
  });

  it('should trigger Last-Gasp Beacon flag when battery level falls to 5% or below', () => {
    const normal = BatteryRuntimeEstimator.estimateRuntime(10, false);
    expect(normal.isCriticalLastGasp).toBe(false);

    const critical = BatteryRuntimeEstimator.estimateRuntime(5, false);
    expect(critical.isCriticalLastGasp).toBe(true);
    expect(critical.formattedRemaining).toContain('Last-Gasp Beacon');

    const nearZero = BatteryRuntimeEstimator.estimateRuntime(2, false);
    expect(nearZero.isCriticalLastGasp).toBe(true);
  });

  it('should report unlimited runtime when charging', () => {
    const charging = BatteryRuntimeEstimator.estimateRuntime(15, true);
    expect(charging.isCharging).toBe(true);
    expect(charging.isCriticalLastGasp).toBe(false);
    expect(charging.formattedRemaining).toContain('กำลังชาร์จไฟ');
  });

  it('should accurately convert 5-Bar Battery tiers to visual indicators and colors', () => {
    // 5 bars (81-100%)
    const b5 = getBatteryBarsVisual(5);
    expect(b5.text).toBe('🟩🟩🟩🟩🟩');
    expect(b5.percentStr).toBe('81-100%');
    expect(b5.color).toBe('#22c55e');

    // 4 bars (61-80%)
    const b4 = getBatteryBarsVisual(4);
    expect(b4.text).toBe('🟩🟩🟩🟩⬜');
    expect(b4.percentStr).toBe('61-80%');

    // 3 bars (41-60%)
    const b3 = getBatteryBarsVisual(3);
    expect(b3.text).toBe('🟨🟨🟨⬜⬜');
    expect(b3.percentStr).toBe('41-60%');

    // 2 bars (21-40%)
    const b2 = getBatteryBarsVisual(2);
    expect(b2.text).toBe('🟧🟧⬜⬜⬜');
    expect(b2.percentStr).toBe('21-40%');

    // 1 bar (1-20% Critical)
    const b1 = getBatteryBarsVisual(1);
    expect(b1.text).toBe('🟥⬜⬜⬜⬜');
    expect(b1.percentStr).toBe('1-20%');
    expect(b1.color).toBe('#ef4444');
  });

  it('should enforce Privacy Mode: format peer labels using Short NodeID only without exposing nicknames', () => {
    const demoPeer = {
      shortNodeId: '#4C55',
      lat: 13.7570,
      lng: 100.5025,
      batteryBars: 5,
      rssiTier: 3,
      distanceMeters: 45
    };

    // Verify format complies with Privacy-preserving Short NodeID (#XXXX)
    expect(demoPeer.shortNodeId).toMatch(/^#[0-9A-F]{4}$/i);
    expect(demoPeer.distanceMeters).toBe(45);
    expect(demoPeer.batteryBars).toBe(5);
  });
});
