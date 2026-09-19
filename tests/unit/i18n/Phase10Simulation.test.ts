/**
 * Phase 10: Multiplatform UI/UX, 10 Global Languages & Disaster Drills Unit Tests
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 10
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EpidemicRouter } from '../../../src/core/routing/EpidemicRouter';
import { ITOGPacket, TOGPacketType, TOGPriority } from '../../../src/core/protocol/TOGPacket';
import { BloomFilter } from '../../../src/core/protocol/BloomFilter';
import { ModeStateMachine, AppOperatingMode } from '../../../src/core/state/ModeStateMachine';
import { OneTapSosEngine, SosStatusCategory } from '../../../src/core/state/OneTapSosEngine';

describe('Phase 10: Multiplatform UI/UX, 10 Global Languages & Disaster Drills', () => {
  describe('Task 10.1: Universal 10-Language Embedded i18n Engine & Key Parity', () => {
    const languages = ['th', 'en', 'my', 'lo', 'km', 'vi', 'ms', 'zh', 'ja', 'es'];
    const requiredKeys = [
      'app_name',
      'one_tap_sos',
      'disaster_mesh_mode',
      'radar_compass',
      'battery_critical',
      'evacuate_immediate',
    ];

    it('should verify all 10 language translation files exist with 100% key parity', () => {
      for (const lang of languages) {
        const filePath = join(process.cwd(), `src/locales/${lang}.json`);
        expect(existsSync(filePath)).toBe(true);

        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);

        for (const key of requiredKeys) {
          expect(json[key]).toBeDefined();
          expect(typeof json[key]).toBe('string');
          expect(json[key].trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Task 10.2 & 10.4: Multi-Hop 15-Hop Relay & Anti-Loop Simulation Drill', () => {
    it('should successfully propagate SOS across 15 simulated nodes with zero packet loops', () => {
      const NODE_COUNT = 15;
      const routers: EpidemicRouter[] = [];

      for (let i = 0; i < NODE_COUNT; i++) {
        const bloom = new BloomFilter(1000, 3);
        routers.push(new EpidemicRouter(`node-${i}`, 0x8828308281fffff0n, bloom));
      }

      const originalPacket: ITOGPacket = {
        header: {
          magic: 0x544F,
          version: 1,
          packetType: TOGPacketType.SOS_BEACON,
          ttlHops: 15,
          priority: TOGPriority.CRITICAL_SOS,
          flags: 0,
          reserved: 0,
        },
        messageId: 0x99887766n,
        senderPubkeyHash: new Uint8Array([0xAA, 1, 2, 3, 4, 5, 6, 7]),
        recipientHash: new Uint8Array(8),
        targetH3Index: 0x8828308281fffff0n,
        payloadLength: 5,
        payload: new Uint8Array([1, 2, 3, 4, 5]),
      };

      let currentPacket: ITOGPacket | null = originalPacket;

      for (let i = 0; i < NODE_COUNT - 1; i++) {
        const currentRouter = routers[i];
        const forwarded = currentRouter.relayPacket(currentPacket!);
        expect(forwarded).not.toBeNull();
        expect(forwarded!.header.ttlHops).toBe(15 - (i + 1));

        // Duplicate rejection
        expect(currentRouter.relayPacket(currentPacket!)).toBeNull();
        currentPacket = forwarded;
      }
    });
  });

  describe('Task 10.3 & 10.4: Grid Outage 5-Second Automatic Fallback Simulation', () => {
    it('should detect network outage and autonomously engage DISASTER_MESH within 5 seconds', () => {
      const sm = new ModeStateMachine(AppOperatingMode.NORMAL_CLOUD);
      const t0 = 2000000;

      sm.updateConnectivity(false, t0);
      sm.checkGracePeriod(t0 + 4900);
      expect(sm.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);

      sm.checkGracePeriod(t0 + 5001);
      expect(sm.getOperatingMode()).toBe(AppOperatingMode.DISASTER_MESH);
      expect(sm.isMeshEngaged()).toBe(true);

      const beacon = OneTapSosEngine.createSosBeacon({
        lat: 13.7563,
        lng: 100.5018,
        batteryLevel: 50,
        category: SosStatusCategory.GENERAL_EMERGENCY,
        senderPubkeyHash: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      });

      expect(beacon.header.packetType).toBe(TOGPacketType.SOS_BEACON);
      expect(beacon.header.ttlHops).toBe(15);
    });
  });
});
