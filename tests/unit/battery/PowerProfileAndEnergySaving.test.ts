import { describe, it, expect, beforeEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import {
  powerProfileManager,
  PowerProfile,
  selectedPowerProfileStore,
  effectivePowerProfileStore
} from '../../../src/core/state/PowerProfileStore';
import {
  calculateBroadcastInterval,
  peerDiscoveryManager
} from '../../../src/core/state/PeerDiscoveryStore';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { MockOutGridBridge } from '../../../src/core/native/MockOutGridBridge';

describe('Emergency Power Profiles & 4-Tier Energy Saving Suite', () => {

  beforeEach(() => {
    powerProfileManager.setProfile(PowerProfile.AUTO);
    powerProfileManager.updateBattery(85, false);
  });

  describe('PowerProfileStore & Dynamic Derivation', () => {
    it('should derive NORMAL mode when battery is > 50% in AUTO profile', () => {
      powerProfileManager.updateBattery(85, false);
      expect(powerProfileManager.getProfile()).toBe(PowerProfile.AUTO);
      expect(powerProfileManager.getEffectiveProfile()).toBe(PowerProfile.NORMAL);
    });

    it('should derive ECO mode when battery is between 20% and 50% in AUTO profile', () => {
      powerProfileManager.updateBattery(35, false);
      expect(powerProfileManager.getProfile()).toBe(PowerProfile.AUTO);
      expect(powerProfileManager.getEffectiveProfile()).toBe(PowerProfile.ECO);
    });

    it('should derive SURVIVAL mode when battery is < 20% in AUTO profile', () => {
      powerProfileManager.updateBattery(15, false);
      expect(powerProfileManager.getProfile()).toBe(PowerProfile.AUTO);
      expect(powerProfileManager.getEffectiveProfile()).toBe(PowerProfile.SURVIVAL);
    });

    it('should override low battery to NORMAL when device is charging', () => {
      powerProfileManager.updateBattery(10, true);
      expect(powerProfileManager.getEffectiveProfile()).toBe(PowerProfile.NORMAL);
    });

    it('should respect explicit user selection overriding AUTO', () => {
      powerProfileManager.updateBattery(10, false);
      powerProfileManager.setProfile(PowerProfile.ECO);
      expect(powerProfileManager.getProfile()).toBe(PowerProfile.ECO);
      expect(powerProfileManager.getEffectiveProfile()).toBe(PowerProfile.ECO);

      powerProfileManager.setProfile(PowerProfile.NORMAL);
      expect(powerProfileManager.getProfile()).toBe(PowerProfile.NORMAL);
      expect(powerProfileManager.getEffectiveProfile()).toBe(PowerProfile.NORMAL);

      powerProfileManager.setProfile(PowerProfile.SURVIVAL);
      expect(powerProfileManager.getProfile()).toBe(PowerProfile.SURVIVAL);
      expect(powerProfileManager.getEffectiveProfile()).toBe(PowerProfile.SURVIVAL);
    });

    it('should return comprehensive profile details with drain estimates', () => {
      const details = powerProfileManager.getProfileDetails(PowerProfile.ECO);
      expect(details.label).toContain('Eco');
      expect(details.scanDutyMode).toContain('Dynamic');
      expect(details.estimatedDrainPerHourMah).toContain('8-12');
    });
  });

  describe('Adaptive Presence Chirp Intervals (Item 2)', () => {
    it('should preserve standard backward-compatible intervals for normal moving nodes', () => {
      expect(calculateBroadcastInterval(0)).toBe(15000);
      expect(calculateBroadcastInterval(5)).toBe(15000);
      expect(calculateBroadcastInterval(10)).toBe(25000);
      expect(calculateBroadcastInterval(20)).toBe(40000);
      expect(calculateBroadcastInterval(50)).toBe(60000);
    });

    it('should extend chirp interval when in ECO profile or device is stationary to conserve TX power', () => {
      expect(calculateBroadcastInterval(0, PowerProfile.ECO)).toBe(35000);
      expect(calculateBroadcastInterval(5, PowerProfile.ECO)).toBe(35000);
      expect(calculateBroadcastInterval(10, PowerProfile.ECO)).toBe(50000);
      expect(calculateBroadcastInterval(20, PowerProfile.ECO)).toBe(70000);
      expect(calculateBroadcastInterval(50, PowerProfile.ECO)).toBe(90000);

      // Stationary flag also extends intervals
      expect(calculateBroadcastInterval(0, PowerProfile.NORMAL, true)).toBe(35000);
      expect(calculateBroadcastInterval(10, PowerProfile.NORMAL, true)).toBe(50000);
    });

    it('should extend chirp intervals to multiple minutes in SURVIVAL profile', () => {
      expect(calculateBroadcastInterval(3, PowerProfile.SURVIVAL)).toBe(120000);
      expect(calculateBroadcastInterval(10, PowerProfile.SURVIVAL)).toBe(180000);
      expect(calculateBroadcastInterval(25, PowerProfile.SURVIVAL)).toBe(300000);
    });

    it('should track stationary flag on peerDiscoveryManager', () => {
      peerDiscoveryManager.setStationary(true);
      expect(peerDiscoveryManager.getIsStationary()).toBe(true);
      peerDiscoveryManager.setStationary(false);
      expect(peerDiscoveryManager.getIsStationary()).toBe(false);
    });
  });

  describe('Native Bridge & Dispatcher Power Profile Contract (Item 1 & 4)', () => {
    it('should support setPowerProfile and boostScanPerformance on MockOutGridBridge', () => {
      const bridge = new MockOutGridBridge();
      expect(bridge.setPowerProfile('ECO')).toBe(true);
      expect(bridge.getPowerProfile()).toBe('ECO');
      expect(bridge.boostScanPerformance(1000)).toBe(true);
      expect(bridge.isPerformanceBoosted()).toBe(true);
    });

    it('should route setPowerProfile through NativeBridgeDispatcher without errors', () => {
      const dispatcher = NativeBridgeDispatcher.getInstance();
      expect(dispatcher.setPowerProfile('ECO')).toBe(true);
      expect(dispatcher.boostScanPerformance(5000)).toBe(true);
    });
  });

  describe('Android Native Radio Driver & Bridge Code Quality (Item 1)', () => {
    it('should verify BleRadioNativeDriver.kt contains dynamic scan mode and boost logic', () => {
      const driverPath = path.resolve('android/app/src/main/java/io/outgrid/mesh/BleRadioNativeDriver.kt');
      expect(fs.existsSync(driverPath)).toBe(true);
      const content = fs.readFileSync(driverPath, 'utf-8');

      expect(content).toContain('setPowerProfile');
      expect(content).toContain('boostScanPerformance');
      expect(content).toContain('ScanSettings.SCAN_MODE_LOW_POWER');
      expect(content).toContain('ScanSettings.SCAN_MODE_BALANCED');
      expect(content).toContain('restartScanningWithCurrentProfile');
    });

    it('should verify OutGridAndroidBridge.kt exposes setPowerProfile and boostScanPerformance to Web', () => {
      const bridgePath = path.resolve('android/app/src/main/java/io/outgrid/mesh/OutGridAndroidBridge.kt');
      expect(fs.existsSync(bridgePath)).toBe(true);
      const content = fs.readFileSync(bridgePath, 'utf-8').replace(/\r\n/g, '\n');

      expect(content).toContain('@JavascriptInterface\n    fun setPowerProfile');
      expect(content).toContain('@JavascriptInterface\n    fun boostScanPerformance');
      expect(content).toContain('BleRadioNativeDriver.boostScanPerformance');
    });
  });
});
