/**
 * Unit tests for NativeBridgeContract (Sprint B Task B.6)
 * Verifies that the Native Bridge contract adheres to OutGridAndroidBridge specifications
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Native Bridge Interface
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MockOutGridBridge } from '../../../src/core/native/MockOutGridBridge';

describe('NativeBridgeContract (Sprint B Task B.6 Android Native Interface)', () => {
  let bridge: MockOutGridBridge;

  beforeEach(() => {
    bridge = new MockOutGridBridge();
  });

  it('should toggle and control flashlight torch states correctly', () => {
    expect(bridge.isTorchOn()).toBe(false);

    expect(bridge.toggleTorch(true)).toBe(true);
    expect(bridge.isTorchOn()).toBe(true);

    expect(bridge.startSosStrobe()).toBe(true);
    expect(bridge.isSosStrobeOn()).toBe(true);
    expect(bridge.isTorchOn()).toBe(true);

    expect(bridge.stopTorch()).toBe(true);
    expect(bridge.isTorchOn()).toBe(false);
    expect(bridge.isSosStrobeOn()).toBe(false);
  });

  it('should retrieve structured battery telemetry matching Android API', () => {
    const batteryRaw = bridge.getBatteryInfo();
    const battery = JSON.parse(batteryRaw);

    expect(typeof battery.level).toBe('number');
    expect(battery.level).toBeGreaterThanOrEqual(0);
    expect(battery.level).toBeLessThanOrEqual(100);
    expect(typeof battery.isCharging).toBe('boolean');
    expect(typeof battery.temperature).toBe('number');
    expect(typeof battery.voltage).toBe('number');
  });

  it('should handle Doze mode battery optimization exemptions', () => {
    expect(bridge.isIgnoringBatteryOptimizations()).toBe(false);
    expect(bridge.requestBatteryOptimizationExemption()).toBe(true);
    expect(bridge.isIgnoringBatteryOptimizations()).toBe(true);
  });

  it('should manage APK offline hotspot lifecycle', () => {
    expect(bridge.isHotspotActive()).toBe(false);

    const hotspotUrl = bridge.startApkHotspot();
    expect(hotspotUrl.startsWith('http://')).toBe(true);
    expect(hotspotUrl.endsWith('.apk')).toBe(true);
    expect(bridge.isHotspotActive()).toBe(true);

    expect(bridge.stopApkHotspot()).toBe(true);
    expect(bridge.isHotspotActive()).toBe(false);
  });

  it('should support emergency wake screen and haptic SOS vibration', () => {
    expect(bridge.isScreenAwake()).toBe(false);
    expect(bridge.wakeScreenForEmergency()).toBe(true);
    expect(bridge.isScreenAwake()).toBe(true);

    expect(bridge.vibrateSosPattern()).toBe(true);
  });

  it('should provide compass orientation and barometric altitude telemetry', () => {
    const compass = JSON.parse(bridge.getCompassOrientation());
    expect(typeof compass.azimuth).toBe('number');
    expect(compass.azimuth).toBeGreaterThanOrEqual(0);
    expect(compass.azimuth).toBeLessThanOrEqual(360);

    const alt = JSON.parse(bridge.getBarometerAltitude());
    expect(typeof alt.pressureHpa).toBe('number');
    expect(typeof alt.relativeAltitudeMeters).toBe('number');
  });
});
