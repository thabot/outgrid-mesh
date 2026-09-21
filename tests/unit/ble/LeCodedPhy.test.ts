/**
 * Unit tests for LeCodedPhy (S=8 Long Range negotiation, Fallback to 1M PHY)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { LeCodedPhy, BlePhyType, LeCodedScheme } from '../../../src/core/ble/LeCodedPhy';

describe('LeCodedPhy (Bluetooth 5 LE Coded PHY Long Range Driver)', () => {
  it('should negotiate LE Coded PHY S=8 and provide ~400m estimated range on capable hardware', () => {
    const driver = new LeCodedPhy({ supportsLeCodedPhy: true });

    expect(driver.getCurrentPhy()).toBe(BlePhyType.PHY_LE_CODED);
    expect(driver.getCurrentScheme()).toBe(LeCodedScheme.S8);
    expect(driver.getEstimatedRangeMeters()).toBeGreaterThanOrEqual(400);
  });

  it('should automatically fallback to BLE 1M PHY when hardware does not support Coded PHY', () => {
    // Older Android phone with no Coded PHY support
    const legacyDriver = new LeCodedPhy({ supportsLeCodedPhy: false });

    // Requesting Coded PHY
    const negotiated = legacyDriver.negotiatePhy(BlePhyType.PHY_LE_CODED);

    // Must fallback to 1M PHY
    expect(negotiated).toBe(BlePhyType.PHY_LE_1M);
    expect(legacyDriver.getCurrentPhy()).toBe(BlePhyType.PHY_LE_1M);
    expect(legacyDriver.getEstimatedRangeMeters()).toBe(80);
    expect(legacyDriver.isLegacyHardware()).toBe(true);
    expect(legacyDriver.getOptimalChunkSize()).toBe(24);
  });

  it('should report correct optimal chunk size on BLE 5 Coded PHY hardware', () => {
    const modernDriver = new LeCodedPhy({ supportsLeCodedPhy: true });
    expect(modernDriver.isLegacyHardware()).toBe(false);
    expect(modernDriver.getOptimalChunkSize()).toBe(180);
  });
});
