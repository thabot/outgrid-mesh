/**
 * Unit tests for BleConnectionManager (GATT Handshake & MTU 512B)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import {
  BleConnectionManager,
  DEFAULT_BLE_MTU,
  TARGET_MAX_MTU
} from '../../../src/core/ble/BleConnectionManager';

describe('BleConnectionManager (GATT Server/Client Handshake & MTU)', () => {
  it('should negotiate MTU up to 512 Bytes for high throughput', () => {
    const manager = new BleConnectionManager();
    const session = manager.connect('AA:BB:CC:DD:EE:FF', 512);

    expect(session.isConnected).toBe(true);
    expect(session.mtu).toBe(TARGET_MAX_MTU);
    expect(manager.getActiveCount()).toBe(1);

    manager.disconnect('AA:BB:CC:DD:EE:FF');
    expect(manager.getActiveCount()).toBe(0);
  });

  it('should clamp MTU between 23 and 512 bytes', () => {
    const manager = new BleConnectionManager();

    const lowSession = manager.connect('node-low', 10);
    expect(lowSession.mtu).toBe(DEFAULT_BLE_MTU);

    const highSession = manager.connect('node-high', 1000);
    expect(highSession.mtu).toBe(TARGET_MAX_MTU);
  });
});
