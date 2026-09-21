import { describe, expect, it } from 'bun:test';
import { CrossRadioBridge } from '../../../src/core/routing/CrossRadioBridge';
import { BleGattSessionManager } from '../../../src/core/ble/BleGattSessionManager';
import { MediaChunkingHandler, MediaType } from '../../../src/core/ble/MediaChunkingHandler';

describe('Phase 5 - Task 5.1 & 5.2: Cross-Radio Bridge, Quick-GATT & Media Chunking', () => {
  it('should deduplicate ingress packets and prevent loopback echo', () => {
    const bridge = new CrossRadioBridge();
    const msgId = 123456789n;

    // First arrival via LoRa
    const isNovelFirst = bridge.handleIngressPacket(msgId, 'LORA');
    expect(isNovelFirst).toBe(true);

    // Second arrival via BLE (duplicate)
    const isNovelDuplicate = bridge.handleIngressPacket(msgId, 'BLE_CODED');
    expect(isNovelDuplicate).toBe(false);

    // Egress candidates should not include LORA (ingress radio)
    const egress = bridge.getEligibleEgressRadios(msgId, ['BLE_CODED', 'LORA', 'WIFI_DIRECT']);
    expect(egress).toContain('BLE_CODED');
    expect(egress).toContain('WIFI_DIRECT');
    expect(egress).not.toContain('LORA');
  });

  it('should clamp MTU and manage watchdog & backoff in Quick-GATT session', () => {
    const mgr = new BleGattSessionManager({ maxSafeMtu: 182 });

    // Clamp MTU 512 down to 182
    expect(mgr.clampMtu(512)).toBe(182);

    // Clamp MTU 100 down to 97 (100 - 3)
    expect(mgr.clampMtu(100)).toBe(97);

    // Exponential backoff
    expect(mgr.calculateBackoffDelay(0)).toBe(1000);
    expect(mgr.calculateBackoffDelay(1)).toBe(2000);
    expect(mgr.calculateBackoffDelay(2)).toBe(4000);
  });

  it('should split and reassemble media chunks with 8B header', () => {
    const fakeImage = new Uint8Array(2500); // 2.5 KB emergency photo
    for (let i = 0; i < fakeImage.length; i++) fakeImage[i] = i % 255;

    const chunks = MediaChunkingHandler.splitMedia(MediaType.EMERGENCY_PHOTO, fakeImage, 180);
    expect(chunks.length).toBe(Math.ceil(2500 / 180));

    const reassembled = MediaChunkingHandler.reassembleMedia(chunks);
    expect(reassembled).not.toBeNull();
    expect(reassembled?.length).toBe(2500);
    expect(reassembled?.[10]).toBe(fakeImage[10]);
  });
});
