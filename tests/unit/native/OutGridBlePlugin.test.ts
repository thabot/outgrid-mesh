/**
 * Unit tests for OutGridBlePlugin & Native Build Pipeline
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 7 & Sprint H
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { MockOutGridBridge } from '../../../src/core/native/MockOutGridBridge';
import fs from 'node:fs';
import path from 'node:path';

describe('Sprint H: Android Native Build & Hardware Plugins', () => {
  describe('Task H.1: Capacitor Configuration & ProGuard R8 Rules', () => {
    it('should have valid capacitor.config.ts with io.outgrid.mesh and build webDir', async () => {
      const configPath = path.resolve('capacitor.config.ts');
      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content.includes('io.outgrid.mesh')).toBe(true);
      expect(content.includes('OutGrid Mesh')).toBe(true);
      expect(content.includes('build')).toBe(true);
    });

    it('should have proguard-rules.pro preserving JavascriptInterface and data models', () => {
      const proguardPath = path.resolve('android/app/proguard-rules.pro');
      expect(fs.existsSync(proguardPath)).toBe(true);

      const content = fs.readFileSync(proguardPath, 'utf-8');
      expect(content.includes('@android.webkit.JavascriptInterface')).toBe(true);
      expect(content.includes('io.outgrid.mesh.**')).toBe(true);
    });
  });

  describe('Task H.2: Hardware Native BLE Radio Plugin', () => {
    it('should transmit raw packet bytes over NativeBridgeDispatcher with high TX power default', () => {
      const dispatcher = NativeBridgeDispatcher.getInstance();
      const testPacket = new Uint8Array([0x54, 0x4F, 0x01, 0x07, 0x00, 0x01, 0x02]);

      const success = dispatcher.transmitRadioPacket(testPacket, true);
      expect(success).toBe(true);

      // Verify bridge implementation captured the payload
      const mockBridge = (dispatcher as any).bridgeImpl as MockOutGridBridge;
      const last = mockBridge.getLastTransmittedPacket();
      expect(last).not.toBeNull();
      expect(last?.txPowerHigh).toBe(true);
      expect(typeof last?.base64 === 'string' && last.base64.length > 0).toBe(true);
    });

    it('should support low TX power transmission for battery-saving mode', () => {
      const dispatcher = NativeBridgeDispatcher.getInstance();
      const testPacket = new Uint8Array([0x54, 0x4F, 0x07, 0x02]);

      const success = dispatcher.transmitRadioPacket(testPacket, false);
      expect(success).toBe(true);

      const mockBridge = (dispatcher as any).bridgeImpl as MockOutGridBridge;
      const last = mockBridge.getLastTransmittedPacket();
      expect(last?.txPowerHigh).toBe(false);
    });

    it('should verify OutGridBlePlugin.kt has TOG Service UUID 0x544F and hardware filtering', () => {
      const pluginPath = path.resolve('android/app/src/main/java/io/outgrid/mesh/OutGridBlePlugin.kt');
      expect(fs.existsSync(pluginPath)).toBe(true);

      const content = fs.readFileSync(pluginPath, 'utf-8');
      expect(content.includes('0000544f-0000-1000-8000-00805f9b34fb')).toBe(true);
      expect(content.includes('BluetoothLeAdvertiser')).toBe(true);
      expect(content.includes('BluetoothLeScanner')).toBe(true);
      expect(content.includes('ScanFilter')).toBe(true);
    });
  });

  describe('Task H.3: 24/7 Foreground Service & Doze Mode Defense', () => {
    it('should verify OutGridMeshService.kt schedules AlarmManager setExactAndAllowWhileIdle', () => {
      const servicePath = path.resolve('android/app/src/main/java/io/outgrid/mesh/OutGridMeshService.kt');
      expect(fs.existsSync(servicePath)).toBe(true);

      const content = fs.readFileSync(servicePath, 'utf-8');
      expect(content.includes('AlarmManager')).toBe(true);
      expect(content.includes('setExactAndAllowWhileIdle')).toBe(true);
      expect(content.includes('PARTIAL_WAKE_LOCK')).toBe(true);
    });

    it('should verify BootReceiver.kt auto-starts service on device boot', () => {
      const bootPath = path.resolve('android/app/src/main/java/io/outgrid/mesh/BootReceiver.kt');
      expect(fs.existsSync(bootPath)).toBe(true);

      const content = fs.readFileSync(bootPath, 'utf-8');
      expect(content.includes('ACTION_BOOT_COMPLETED')).toBe(true);
      expect(content.includes('startForegroundService')).toBe(true);
    });
  });

  describe('Task H.4: Automated Android Build Pipeline Script', () => {
    it('should verify buildAndroidApk.js script exists and defines complete 4-step workflow', () => {
      const scriptPath = path.resolve('scripts/buildAndroidApk.js');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content.includes('checkSyntax.js')).toBe(true);
      expect(content.includes('bun run build')).toBe(true);
      expect(content.includes('androidAssetsDir')).toBe(true);
      expect(content.includes('AndroidManifest.xml')).toBe(true);
    });
  });
});
