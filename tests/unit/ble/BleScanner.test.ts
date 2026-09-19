/**
 * Unit tests for BleScanner (Hardware ScanFilter & Deduplication)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { BleScanner, type IScanResult } from '../../../src/core/ble/BleScanner';
import { TOG_MAGIC } from '../../../src/core/protocol/TOGPacket';

describe('BleScanner (Hardware ScanFilter & Deduplication)', () => {
  it('should accept packets matching TOG_MAGIC (0x544F)', () => {
    const scanner = new BleScanner();
    const received: IScanResult[] = [];

    scanner.startScan((res) => received.push(res));

    const payload = new Uint8Array([0x54, 0x4f, 0x01]);
    const accepted = scanner.processRawAdv('AA:BB:CC:DD:EE:FF', -65, TOG_MAGIC, payload);

    expect(accepted).toBe(true);
    expect(received.length).toBe(1);
    expect(received[0].rssiDbm).toBe(-65);
    expect(received[0].manufacturerId).toBe(TOG_MAGIC);
  });

  it('should reject foreign advertisements not matching TOG_MAGIC', () => {
    const scanner = new BleScanner();
    const received: IScanResult[] = [];

    scanner.startScan((res) => received.push(res));

    const foreignPayload = new Uint8Array([0x00, 0x11]);
    const accepted = scanner.processRawAdv('11:22:33:44:55:66', -50, 0x004c /* Apple iBeacon */, foreignPayload);

    expect(accepted).toBe(false);
    expect(received.length).toBe(0);
  });

  it('should filter immediate duplicate advertisements from same device', () => {
    const scanner = new BleScanner();
    let count = 0;

    scanner.startScan(() => count++);

    const payload = new Uint8Array([0x54, 0x4f, 0x01, 0x05]);

    // 1st reception
    expect(scanner.processRawAdv('dev-1', -70, TOG_MAGIC, payload)).toBe(true);
    // 2nd duplicate reception
    expect(scanner.processRawAdv('dev-1', -70, TOG_MAGIC, payload)).toBe(false);

    expect(count).toBe(1);
  });
});
