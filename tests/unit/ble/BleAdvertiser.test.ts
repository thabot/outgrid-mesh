/**
 * Unit tests for BleAdvertiser (Legacy vs Extended Advertising)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { BleAdvertiser } from '../../../src/core/ble/BleAdvertiser';
import { TOG_MAGIC } from '../../../src/core/protocol/TOGPacket';

describe('BleAdvertiser (BLE Advertising Engine)', () => {
  it('should format manufacturer data with TOG_MAGIC (0x544F)', () => {
    const adv = new BleAdvertiser();
    const payload = new Uint8Array([0x54, 0x4f, 0x01, 0x02]);

    adv.startAdvertising(payload);
    expect(adv.isBroadcasting()).toBe(true);

    const mfg = adv.getManufacturerData();
    expect(mfg).not.toBeNull();
    expect(mfg?.manufacturerId).toBe(TOG_MAGIC);
    expect(Array.from(mfg?.data || [])).toEqual([0x54, 0x4f, 0x01, 0x02]);

    adv.stopAdvertising();
    expect(adv.isBroadcasting()).toBe(false);
  });

  it('should enforce 31-byte limit when Extended Advertising is disabled (Legacy mode)', () => {
    const legacyAdv = new BleAdvertiser({ useExtendedAdv: false });
    const validLegacy = new Uint8Array(21); // 21-byte SOS Beacon
    expect(legacyAdv.startAdvertising(validLegacy)).toBe(true);

    const oversize = new Uint8Array(35); // Exceeds 31 bytes
    expect(() => legacyAdv.startAdvertising(oversize)).toThrow('exceeds advertising limit of 31B');
  });

  it('should support up to 254 bytes in BLE 5 Extended Advertising mode', () => {
    const extAdv = new BleAdvertiser({ useExtendedAdv: true });
    const largePacket = new Uint8Array(200);
    expect(extAdv.startAdvertising(largePacket)).toBe(true);
    expect(extAdv.isBroadcasting()).toBe(true);
  });

  it('should safely produce legacy-compatible advertisement data in dual mode', () => {
    const dualAdv = new BleAdvertiser({ useExtendedAdv: true, dualMode: true });
    const packet = new Uint8Array(100);
    for (let i = 0; i < 100; i++) packet[i] = i;

    dualAdv.startAdvertising(packet);

    const legacyMfg = dualAdv.getLegacyManufacturerData();
    expect(legacyMfg).not.toBeNull();
    expect(legacyMfg?.manufacturerId).toBe(TOG_MAGIC);
    expect(legacyMfg?.isLegacy).toBe(true);
    expect(legacyMfg?.data.length).toBeLessThanOrEqual(24);
  });
});
