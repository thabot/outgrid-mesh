/**
 * Battery Optimization & Power Management Audit Test Suite
 * Validates BLE scanning parameters, presence intervals, duty cycle windows, and sensor lifecycle
 * Protocol: TOG v1.1 Survival Power Model
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
import { describe, it, expect } from 'bun:test';
import { calculateBroadcastInterval } from '../../../src/core/state/PeerDiscoveryStore';
import { DutyCycleManager, DutyCycleMode } from '../../../src/core/battery/DutyCycleManager';
import { DutyCycleController, BatteryTier } from '../../../src/core/ble/DutyCycleController';
import { BatteryRuntimeEstimator } from '../../../src/core/battery/BatteryRuntimeEstimator';

describe('Battery Optimization & Power Management Suite', () => {
  describe('Energy-Optimized Broadcast Intervals', () => {
    it('should use 15s interval for <= 5 nodes to minimize radio wakeups', () => {
      expect(calculateBroadcastInterval(0)).toBe(15000);
      expect(calculateBroadcastInterval(3)).toBe(15000);
      expect(calculateBroadcastInterval(5)).toBe(15000);
    });

    it('should scale gracefully up to 60s as node density increases', () => {
      expect(calculateBroadcastInterval(10)).toBe(25000);
      expect(calculateBroadcastInterval(20)).toBe(40000);
      expect(calculateBroadcastInterval(50)).toBe(60000);
    });
  });

  describe('Adaptive Duty Cycle Managers', () => {
    it('should adjust duty cycle window based on battery percentage', () => {
      const manager = new DutyCycleManager(80, false);
      let window = manager.getDutyCycleWindow();
      expect(window.mode).toBe(DutyCycleMode.NORMAL);
      expect(window.allowHighThroughputMedia).toBe(true);

      manager.updateBattery(35, false);
      window = manager.getDutyCycleWindow();
      expect(window.mode).toBe(DutyCycleMode.SAVER);
      expect(window.allowHighThroughputMedia).toBe(false);

      manager.updateBattery(15, false);
      window = manager.getDutyCycleWindow();
      expect(window.mode).toBe(DutyCycleMode.LOW);
      expect(window.canRelayForOthers).toBe(false);

      manager.updateBattery(5, false);
      window = manager.getDutyCycleWindow();
      expect(window.mode).toBe(DutyCycleMode.DEEP_HIBERNATION);
      expect(window.dutyRatioPct).toBeLessThan(0.1);
    });

    it('should provide deep sleep tier under 20% in DutyCycleController', () => {
      const plugged = DutyCycleController.getDutyCycle(10, true);
      expect(plugged.tier).toBe(BatteryTier.TIER_NORMAL);
      expect(plugged.dutyRatioPct).toBe(50);

      const eco = DutyCycleController.getDutyCycle(30, false);
      expect(eco.tier).toBe(BatteryTier.TIER_ECO);

      const deepSleep = DutyCycleController.getDutyCycle(15, false);
      expect(deepSleep.tier).toBe(BatteryTier.TIER_DEEP_SLEEP);
      expect(deepSleep.dutyRatioPct).toBeLessThan(1.0);
    });
  });

  describe('Battery Runtime Estimations', () => {
    it('should calculate accurate runtime based on active hardware load', () => {
      const normalEst = BatteryRuntimeEstimator.estimateRuntime(90, false, false, false);
      expect(normalEst.isCharging).toBe(false);
      expect(normalEst.estimatedHours).toBeGreaterThanOrEqual(40);

      // Strobe flash adds significant drain (~10.2%/hr)
      const strobeEst = BatteryRuntimeEstimator.estimateRuntime(90, false, true, false);
      expect(strobeEst.estimatedHours).toBeLessThan(normalEst.estimatedHours);
    });
  });
});
