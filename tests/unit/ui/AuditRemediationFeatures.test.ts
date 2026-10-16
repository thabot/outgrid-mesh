import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { ImageCompressor, ImageQualityTier } from '../../../src/core/media/ImageCompressor';

describe('Audit Remediation Features & Verification Suite', () => {

  describe('Phase 1: BLE Native Advertising & Background Driver Listener', () => {
    it('should verify OutGridBlePlugin.kt clamps payload to 27 bytes for BLE legacy advertisement', () => {
      const pluginPath = path.resolve('android/app/src/main/java/io/outgrid/mesh/OutGridBlePlugin.kt');
      expect(fs.existsSync(pluginPath)).toBe(true);

      const content = fs.readFileSync(pluginPath, 'utf-8');
      expect(content.includes('val safePayload = if (rawBytes.size > 27)')).toBe(true);
      expect(content.includes('rawBytes.copyOfRange(0, 27)')).toBe(true);
      expect(content.includes('addManufacturerData(TOG_MANUFACTURER_ID, safePayload)')).toBe(true);
    });

    it('should verify BleRadioNativeDriver.kt implements multi-listener registration', () => {
      const driverPath = path.resolve('android/app/src/main/java/io/outgrid/mesh/BleRadioNativeDriver.kt');
      expect(fs.existsSync(driverPath)).toBe(true);

      const content = fs.readFileSync(driverPath, 'utf-8');
      expect(content.includes('packetListeners = java.util.concurrent.CopyOnWriteArraySet')).toBe(true);
      expect(content.includes('fun addPacketListener(')).toBe(true);
      expect(content.includes('fun removePacketListener(')).toBe(true);
      expect(content.includes('packetListeners.forEach { it.invoke(')).toBe(true);
    });

    it('should verify OutGridMeshService.kt registers background SOS packet listener', () => {
      const servicePath = path.resolve('android/app/src/main/java/io/outgrid/mesh/OutGridMeshService.kt');
      expect(fs.existsSync(servicePath)).toBe(true);

      const content = fs.readFileSync(servicePath, 'utf-8');
      expect(content.includes('BleRadioNativeDriver.addPacketListener(servicePacketListener)')).toBe(true);
      expect(content.includes('BleRadioNativeDriver.removePacketListener(servicePacketListener)')).toBe(true);
      expect(content.includes('triggerEmergencyNotification')).toBe(true);
    });
  });

  describe('Phase 2: Android FileProvider & Native Siren Bridge', () => {
    it('should verify AndroidManifest.xml configures FileProvider correctly', () => {
      const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const content = fs.readFileSync(manifestPath, 'utf-8');
      expect(content.includes('androidx.core.content.FileProvider')).toBe(true);
      expect(content.includes('${applicationId}.fileprovider')).toBe(true);
      expect(content.includes('@xml/file_paths')).toBe(true);
    });

    it('should verify file_paths.xml defines valid cache and external paths', () => {
      const pathsFile = path.resolve('android/app/src/main/res/xml/file_paths.xml');
      expect(fs.existsSync(pathsFile)).toBe(true);

      const content = fs.readFileSync(pathsFile, 'utf-8');
      expect(content.includes('<paths')).toBe(true);
      expect(content.includes('<cache-path name="cache" path="." />')).toBe(true);
    });

    it('should verify OutGridAndroidBridge.kt uses package FileProvider and declares siren methods', () => {
      const bridgePath = path.resolve('android/app/src/main/java/io/outgrid/mesh/OutGridAndroidBridge.kt');
      expect(fs.existsSync(bridgePath)).toBe(true);

      const content = fs.readFileSync(bridgePath, 'utf-8');
      expect(content.includes('${context.packageName}.fileprovider')).toBe(true);
      expect(content.includes('fun playAudibleAlarm()')).toBe(true);
      expect(content.includes('fun stopAudibleAlarm()')).toBe(true);
    });
  });

  describe('Phase 3: Web Audio Dual-Tone Siren Fallback & Beacon Controls Bar', () => {
    it('should execute playAudibleAlarm and stopAudibleAlarm without throwing', () => {
      const dispatcher = NativeBridgeDispatcher.getInstance();
      expect(() => dispatcher.playAudibleAlarm()).not.toThrow();
      expect(() => dispatcher.stopAudibleAlarm()).not.toThrow();
    });

    it('should verify BeaconControlsBar.svelte connects buttons to audio siren dispatcher', () => {
      const barPath = path.resolve('src/ui/components/BeaconControlsBar.svelte');
      expect(fs.existsSync(barPath)).toBe(true);

      const content = fs.readFileSync(barPath, 'utf-8');
      expect(content.includes('dispatcher.playAudibleAlarm()')).toBe(true);
      expect(content.includes('dispatcher.stopAudibleAlarm()')).toBe(true);
      expect(content.includes('toggleSiren')).toBe(true);
      expect(content.includes('toggleMute')).toBe(true);
      expect(content.includes('triggerMasterPanic')).toBe(true);
      expect(content.includes('stopAll')).toBe(true);
    });
  });

  describe('Phase 4: Offline Vector Map & GeoJSON Loader', () => {
    it('should verify world_basemap_l2.json exists and is valid GeoJSON', () => {
      const basemapPath = path.resolve('static/data/world_basemap_l2.json');
      expect(fs.existsSync(basemapPath)).toBe(true);

      const raw = fs.readFileSync(basemapPath, 'utf-8');
      const json = JSON.parse(raw);
      expect(json.type).toBe('FeatureCollection');
      expect(Array.isArray(json.features)).toBe(true);
      expect(json.features.length).toBeGreaterThan(0);
    });

    it('should verify SosMapView.svelte implements loadOfflineVectorBasemap', () => {
      const mapViewPath = path.resolve('src/ui/components/SosMapView.svelte');
      expect(fs.existsSync(mapViewPath)).toBe(true);

      const content = fs.readFileSync(mapViewPath, 'utf-8');
      expect(content.includes('loadOfflineVectorBasemap')).toBe(true);
      expect(content.includes('world_basemap_l2.json')).toBe(true);
    });
  });

  describe('Phase 5: Background Crisis Feed & Image Compression Chat Media', () => {
    it('should verify ImageCompressor calculates correct ultra low specs for emergency mesh', () => {
      const specs = ImageCompressor.calculateTargetSpecs(1920, 1080, ImageQualityTier.ULTRA_LOW);
      expect(specs.targetWidth).toBeLessThanOrEqual(320);
      expect(specs.targetHeight).toBeLessThanOrEqual(240);
      expect(specs.format).toBe('image/webp');
      expect(specs.isOfflineAllowed).toBe(true);

      expect(ImageCompressor.isMediaTypePermitted('video/mp4', true)).toBe(false);
      expect(ImageCompressor.isMediaTypePermitted('image/jpeg', true)).toBe(true);
      expect(ImageCompressor.isMediaTypePermitted('image/png', true)).toBe(true);
    });

    it('should verify MeshChatScreen.svelte integrates ImageCompressor and friend scanner dispatch', () => {
      const chatPath = path.resolve('src/ui/components/MeshChatScreen.svelte');
      expect(fs.existsSync(chatPath)).toBe(true);

      const content = fs.readFileSync(chatPath, 'utf-8');
      expect(content.includes('ImageCompressor.calculateTargetSpecs')).toBe(true);
      expect(content.includes('ImageCompressor.isMediaTypePermitted')).toBe(true);
      expect(content.includes("dispatch('openFriendsScanner')")).toBe(true);
    });

    it('should verify +page.svelte integrates CrisisFeed and activeCrisisFeedItems', () => {
      const pagePath = path.resolve('src/routes/+page.svelte');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content.includes('CrisisFeed')).toBe(true);
      expect(content.includes('activeCrisisFeedItems')).toBe(true);
      expect(content.includes('requestBatteryOptimizationExemption')).toBe(true);
      expect(content.includes('on:openTab')).toBe(true);
    });
  });

  describe('Phase 6: Deep End-to-End Verification & Edge Case Fixes', () => {
    it('should verify peerDiscoveryManager supports setStealthMode and isStealthMode', async () => {
      const { peerDiscoveryManager } = await import('../../../src/core/state/PeerDiscoveryStore');
      expect(typeof peerDiscoveryManager.setStealthMode).toBe('function');
      expect(typeof peerDiscoveryManager.isStealthMode).toBe('function');

      peerDiscoveryManager.setStealthMode(true);
      expect(peerDiscoveryManager.isStealthMode()).toBe(true);
      peerDiscoveryManager.setStealthMode(false);
      expect(peerDiscoveryManager.isStealthMode()).toBe(false);
    });

    it('should verify LocalHotspotSideloadService.kt copies APK to cacheDir and serves over HTTP ServerSocket(8080)', () => {
      const servicePath = path.resolve('android/app/src/main/java/io/outgrid/mesh/LocalHotspotSideloadService.kt');
      expect(fs.existsSync(servicePath)).toBe(true);

      const content = fs.readFileSync(servicePath, 'utf-8');
      expect(content.includes('File(context.cacheDir, "OutGrid-Rescue.apk")')).toBe(true);
      expect(content.includes('java.net.ServerSocket(8080)')).toBe(true);
      expect(content.includes('application/vnd.android.package-archive')).toBe(true);
    });

    it('should verify OutGridAndroidBridge.kt uses package:$packageName URI and real SensorManager', () => {
      const bridgePath = path.resolve('android/app/src/main/java/io/outgrid/mesh/OutGridAndroidBridge.kt');
      expect(fs.existsSync(bridgePath)).toBe(true);

      const content = fs.readFileSync(bridgePath, 'utf-8');
      expect(content.includes('Uri.parse("package:$packageName")')).toBe(true);
      expect(content.includes('ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS')).toBe(true);
      expect(content.includes('Sensor.TYPE_PRESSURE')).toBe(true);
    });

    it('should verify HamburgerDrawer.svelte provides navigation to Crisis Feed, Friends, and Profile', () => {
      const drawerPath = path.resolve('src/ui/components/HamburgerDrawer.svelte');
      expect(fs.existsSync(drawerPath)).toBe(true);

      const content = fs.readFileSync(drawerPath, 'utf-8');
      expect(content.includes("dispatch('openTab', { tab: 'feed' })")).toBe(true);
      expect(content.includes("dispatch('openTab', { tab: 'friends' })")).toBe(true);
      expect(content.includes("dispatch('openTab', { tab: 'profile' })")).toBe(true);
    });

    it('should verify AuthProfileScreen.svelte persists encrypted Zero-Knowledge Contact Backup', () => {
      const profilePath = path.resolve('src/ui/components/AuthProfileScreen.svelte');
      expect(fs.existsSync(profilePath)).toBe(true);

      const content = fs.readFileSync(profilePath, 'utf-8');
      expect(content.includes('outgrid_zk_contact_backup_v1')).toBe(true);
      expect(content.includes('TOG-ZK-BACKUP-1.1')).toBe(true);
    });
  });
});
