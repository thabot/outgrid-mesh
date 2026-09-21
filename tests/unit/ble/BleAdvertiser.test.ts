import { describe, expect, it } from 'bun:test';
import { BleAdvertiser } from '../../../src/core/ble/BleAdvertiser';
import { LeCodedPhy, BlePhyType, LeCodedScheme } from '../../../src/core/ble/LeCodedPhy';

describe('Phase 3 - Task 3.1 & 3.2: Radio Scheduler & Interleaved Slot Engine', () => {
  it('should interleave slots in 3:1 ratio under normal mode', () => {
    const adv = new BleAdvertiser({
      useExtendedAdv: true,
      dualMode: true,
      dualModeRatio: 3,
      intervalMs: 100
    });

    adv.startAdvertising(new Uint8Array([1, 2, 3, 4]));

    const slots = [];
    for (let i = 0; i < 4; i++) {
      slots.push(adv.getNextBroadcastSlot());
    }

    expect(slots[0]?.phyMode).toBe('CODED');
    expect(slots[1]?.phyMode).toBe('CODED');
    expect(slots[2]?.phyMode).toBe('CODED');
    expect(slots[3]?.phyMode).toBe('1M'); // 4th slot is Legacy
  });

  it('should adjust ratio to 1:1 and boost Tx Power to +20dBm in Emergency SOS mode', () => {
    const adv = new BleAdvertiser({
      useExtendedAdv: true,
      dualMode: true,
      dualModeRatio: 3,
      intervalMs: 100
    });

    adv.setEmergencySOS(true);
    adv.startAdvertising(new Uint8Array([1, 2, 3, 4]));

    const s0 = adv.getNextBroadcastSlot();
    const s1 = adv.getNextBroadcastSlot();
    const s2 = adv.getNextBroadcastSlot();
    const s3 = adv.getNextBroadcastSlot();

    expect(s0?.phyMode).toBe('CODED');
    expect(s0?.recommendedTxPowerDbm).toBe(20);
    expect(s1?.phyMode).toBe('1M');
    expect(s1?.recommendedTxPowerDbm).toBe(8);

    expect(s2?.phyMode).toBe('CODED');
    expect(s3?.phyMode).toBe('1M');
  });

  it('should calculate jitter delay within 20ms to 50ms window', () => {
    const adv = new BleAdvertiser({ intervalMs: 200 });
    for (let i = 0; i < 20; i++) {
      const delay = adv.calculateJitterDelay(200);
      expect(delay).toBeGreaterThanOrEqual(220);
      expect(delay).toBeLessThanOrEqual(250);
    }
  });

  it('should safely fallback to PHY_LE_1M when hardware does not support Coded PHY', () => {
    const legacyHw = new LeCodedPhy({ supportsLeCodedPhy: false });
    expect(legacyHw.getCurrentPhy()).toBe(BlePhyType.PHY_LE_1M);
    expect(legacyHw.isLegacyHardware()).toBe(true);

    const safePhy = legacyHw.ensureSafePhyMode(BlePhyType.PHY_LE_CODED);
    expect(safePhy).toBe(BlePhyType.PHY_LE_1M);

    const config = legacyHw.getOptimalPhyConfig(true);
    expect(config.phy).toBe(BlePhyType.PHY_LE_1M);
    expect(config.txPowerDbm).toBe(8);
  });
});
