/**
 * Unit Tests for NativeBridgeDispatcher (Sprint B Task B.5 & B.6)
 * Validates two-way native dispatching, packet event handling, and 13 hardware interface methods
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';

describe('NativeBridgeDispatcher (Sprint B Native Dispatcher & Contract Tests)', () => {
  const dispatcher = NativeBridgeDispatcher.getInstance();

  it('should initialize and fallback to MockOutGridBridge in Node/Bun environment', () => {
    expect(dispatcher).toBeDefined();
    expect(dispatcher.isNative()).toBe(false);
  });

  it('should dispatch incoming Base64 packet to subscribed listeners', (done) => {
    // 27-byte TOG test packet (0x54, 0x4F ...)
    const testBytes = new Uint8Array([0x54, 0x4F, 0x01, 0x19, 0x30, 0x01, 0x02, 0x03]);
    const base64 = Buffer.from(testBytes).toString('base64');
    const testRssi = -65;

    const unsubscribe = dispatcher.subscribeToPackets((event) => {
      expect(event.bytes.length).toBe(testBytes.length);
      expect(event.bytes[0]).toBe(0x54);
      expect(event.bytes[1]).toBe(0x4F);
      expect(event.rssi).toBe(testRssi);
      unsubscribe();
      done();
    });

    // Simulate native layer triggering window.OutGridMesh.receiveNativePacket
    dispatcher.handleIncomingNativePacket(base64, testRssi);
  });

  it('should correctly execute all 13 hardware interface contract methods', () => {
    // 1. Torch control
    expect(dispatcher.toggleTorch(true)).toBe(true);
    // 2. SOS Strobe
    expect(dispatcher.startSosStrobe()).toBe(true);
    // 3. Stop Torch
    expect(dispatcher.stopTorch()).toBe(true);

    // 4. Battery info
    const battery = dispatcher.getBatteryInfo();
    expect(battery.level).toBeGreaterThanOrEqual(0);
    expect(battery.level).toBeLessThanOrEqual(100);

    // 5. Battery optimization exemption
    expect(dispatcher.requestBatteryOptimizationExemption()).toBe(true);
    // 6. Check battery optimization status
    expect(dispatcher.isIgnoringBatteryOptimizations()).toBe(true);

    // 7. Share APK file
    expect(dispatcher.shareApkFile()).toBe(true);

    // 8. Start APK hotspot
    const hotspotUrl = dispatcher.startApkHotspot();
    expect(hotspotUrl).toContain('.apk');

    // 9. Stop APK hotspot
    expect(dispatcher.stopApkHotspot()).toBe(true);

    // 10. Wake screen for emergency
    expect(dispatcher.wakeScreenForEmergency()).toBe(true);

    // 11. Vibrate SOS pattern
    expect(dispatcher.vibrateSosPattern()).toBe(true);

    // 12. Compass orientation
    const compass = dispatcher.getCompassOrientation();
    expect(compass.azimuth).toBeGreaterThanOrEqual(0);

    // 13. Barometer altitude
    const alt = dispatcher.getBarometerAltitude();
    expect(alt.pressureHpa).toBeGreaterThan(0);
  });
});
