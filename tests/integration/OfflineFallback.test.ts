/**
 * End-to-End Offline Fallback Simulation Test
 * Simulates total internet disruption (cable cut / cell tower outage)
 * Verifies 5-second automatic fallback to Disaster Mesh Mode with zero manual intervention
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 E2E Fallback Test
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ModeStateMachine, AppOperatingMode } from '../../src/core/state/ModeStateMachine';
import { OneTapSosEngine, SosStatusCategory } from '../../src/core/state/OneTapSosEngine';
import { TOGPacketType } from '../../src/core/protocol/TOGPacket';

describe('OfflineFallbackIntegration (Total Grid Outage Simulation)', () => {
  let sm: ModeStateMachine;

  beforeEach(() => {
    sm = new ModeStateMachine(AppOperatingMode.NORMAL_CLOUD);
  });

  it('should detect cell tower disruption and fall back to Disaster Mesh Mode in exactly 5 seconds', () => {
    const t0 = 1000000;
    expect(sm.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);

    // 1. Catastrophic cellular disruption occurs at t0
    sm.updateConnectivity(false, t0);

    // 2. At t0 + 4.9s: Still within grace period (prevents flapping)
    sm.checkGracePeriod(t0 + 4900);
    expect(sm.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);

    // 3. At t0 + 5.001s: 5s grace period expires -> Automatic switch to DISASTER_MESH
    sm.checkGracePeriod(t0 + 5001);
    expect(sm.getOperatingMode()).toBe(AppOperatingMode.DISASTER_MESH);
    expect(sm.isMeshEngaged()).toBe(true);

    // 4. In Disaster Mesh mode, immediate One-Tap SOS capability is primed and operational
    const sosPkt = OneTapSosEngine.createSosBeacon({
      lat: 13.7563,
      lng: 100.5018,
      batteryLevel: 65,
      category: SosStatusCategory.GENERAL_EMERGENCY,
      senderPubkeyHash: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    });

    expect(sosPkt.header.packetType).toBe(TOGPacketType.SOS_BEACON);
    expect(sosPkt.header.ttlHops).toBe(15);
  });
});
