/**
 * Phase 9: Cloudflare Spatial Signaling, Public STUN & Donation Dashboard Unit Tests
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 9
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { WebRtcSignalingEngine, type ISignalingMessage } from '../../../cloudflare/workers/signaling';
import { CloudflareWorkerApi, type IApiRequest } from '../../../cloudflare/workers/index';
import { D1QuotaCoalescingBuffer } from '../../../cloudflare/workers/d1Buffer';
import { CapAlertIngestionGateway, type ICapAlertInput } from '../../../cloudflare/workers/capAlert';
import { DualTierSpatialPrivacy, type INodeLocationRecord } from '../../../cloudflare/workers/spatialPrivacy';
import { DigitalSignature } from '../../../src/core/crypto/DigitalSignature';
import { CrisisUrgency } from '../../../src/core/feed/CrisisFeedManager';
import { UserRole } from '../../../src/core/auth/AuthManager';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Phase 9: Cloudflare Spatial Signaling, Public STUN & Zero-Trust Sync', () => {
  describe('Task 9.1 & 9.2: Public STUN & WebRTC Spatial Signaling (Zero Media Relay)', () => {
    it('should register node into H3 spatial cell and discover neighboring peers', () => {
      const signaling = new WebRtcSignalingEngine();
      const h3Cell = '8828308281fffff';

      const peersA = signaling.joinSpatialCell(h3Cell, 'node-alpha');
      expect(peersA).toEqual([]);

      const peersB = signaling.joinSpatialCell(h3Cell, 'node-beta');
      expect(peersB).toEqual(['node-alpha']);
    });

    it('should route SDP offer/answer between P2P peers with zero media relay through worker', () => {
      const signaling = new WebRtcSignalingEngine();
      const h3Cell = '8828308281fffff';

      signaling.joinSpatialCell(h3Cell, 'node-alpha');
      signaling.joinSpatialCell(h3Cell, 'node-beta');

      const offerMsg: ISignalingMessage = {
        fromNodeId: 'node-alpha',
        toNodeId: 'node-beta',
        h3TileId: h3Cell,
        type: 'offer',
        payload: 'v=0\r\no=NodeA...',
        timestamp: 1000,
      };

      signaling.sendSignal(offerMsg);
      const pendingForBeta = signaling.pollSignals('node-beta');

      expect(pendingForBeta.length).toBe(1);
      expect(pendingForBeta[0].fromNodeId).toBe('node-alpha');
      expect(pendingForBeta[0].type).toBe('offer');
      expect(signaling.pollSignals('node-beta').length).toBe(0);
    });
  });

  describe('Task 9.2: Cloudflare Workers Edge Gateway & Ed25519 Request Signing', () => {
    it('should verify authentically signed API request and enforce 15s rate limiting', () => {
      const api = new CloudflareWorkerApi();
      const keyPair = DigitalSignature.generateKeyPair();
      const now = 100000;

      function makeRequest(path: string, body: string, ts: number): IApiRequest {
        const msg = new TextEncoder().encode(`${path}:${ts}:${body}`);
        const signature = DigitalSignature.sign(msg, keyPair.privateKey);
        return {
          path,
          nodeId: 'rescue-node-01',
          publicKey: keyPair.publicKey,
          signature,
          timestamp: ts,
          body,
        };
      }

      const req1 = makeRequest('/api/v1/sync', '{"h3Tile":"8828308281fffff"}', now);
      const resp1 = api.handleRequest(req1, now);
      expect(resp1.status).toBe(200);

      // Subsequent rapid request within 15 seconds must be rate-limited (429)
      const req2 = makeRequest('/api/v1/sync', '{}', now + 5000);
      const resp2 = api.handleRequest(req2, now + 5000);
      expect(resp2.status).toBe(429);
    });
  });

  describe('Task 9.3 & 9.4: D1 Spatial Database Schema & Write Coalescing Buffer', () => {
    it('should initialize D1 schema with active_nodes, node_neighbors, passkey_credentials, user_contacts', () => {
      const schemaSql = readFileSync(join(process.cwd(), 'cloudflare/d1/schema.sql'), 'utf-8');
      const db = new Database(':memory:');
      db.run(schemaSql);

      const tables = db.query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
      ).all().map(t => t.name);

      expect(tables).toContain('active_nodes');
      expect(tables).toContain('node_neighbors');
      expect(tables).toContain('passkey_credentials');
      expect(tables).toContain('user_contacts');
    });

    it('should coalesce rapid node heartbeat updates into single batch write preserving D1 free tier', () => {
      const coalescer = new D1QuotaCoalescingBuffer();

      for (let i = 1; i <= 5; i++) {
        coalescer.enqueueUpdate({
          nodeId: 'node-01',
          publicKeyHex: 'pk01',
          h3Res7Index: 'h3_7_a',
          batteryLevel: 100 - i,
          role: 'GUEST_VICTIM',
          timestamp: 1000 + i * 10,
        });
      }

      expect(coalescer.getPendingCount()).toBe(1);
      const flushed = coalescer.flushBatch();
      expect(flushed.length).toBe(1);
      expect(flushed[0].batteryLevel).toBe(95);
      expect(coalescer.getPendingCount()).toBe(0);
    });
  });

  describe('Task 9.5: CAP v1.2 Inbound Emergency Alert Ingestion Gateway', () => {
    it('should parse CAP v1.2 XML/JSON payload and emit authentic signed crisis feed alert', () => {
      const keyPair = DigitalSignature.generateKeyPair();
      const gateway = new CapAlertIngestionGateway(keyPair.privateKey, keyPair.publicKey);

      const capInput: ICapAlertInput = {
        identifier: 'CAP-TH-DDPM-2026-0042',
        sender: 'ศูนย์เตือนภัยพิบัติแห่งชาติ (NDWC)',
        sent: '2026-09-19T12:00:00Z',
        status: 'Actual',
        msgType: 'Alert',
        info: {
          urgency: 'Immediate',
          severity: 'Extreme',
          headline: 'แจ้งเตือนคลื่นสึนามิ บริเวณชายฝั่งทะเลอันดามัน',
          description: 'เกิดแผ่นดินไหวขนาด 8.5 ให้ประชาชนอพยพขึ้นที่สูงทันที',
        },
      };

      const feedItem = gateway.ingestCapAlert(capInput);
      expect(feedItem.id).toBe('CAP-TH-DDPM-2026-0042');
      expect(feedItem.urgency).toBe(CrisisUrgency.EVACUATE_IMMEDIATE);
      expect(feedItem.title).toBe(capInput.info.headline);

      // Verify digital signature
      const rawMsg = new TextEncoder().encode(
        `${feedItem.id}:${feedItem.urgency}:${feedItem.title}:${feedItem.content}:${feedItem.timestamp}`
      );
      const isValid = DigitalSignature.verify(feedItem.signature, rawMsg, keyPair.publicKey);
      expect(isValid).toBe(true);
    });
  });

  describe('Task 9.6 & 9.7: Dual-Tier Spatial Privacy & FIDO2 Passkey Verification', () => {
    it('should strictly mask detailed GPS into H3 Res 7 for public and unlock Res 9 for verified responder', () => {
      const records: INodeLocationRecord[] = [
        {
          nodeId: 'victim-01',
          res9Cell: '8928308280fffff',
          deltaX: 12,
          deltaY: -35,
          isSosActive: true,
        },
        {
          nodeId: 'victim-02',
          res9Cell: '8928308280bffff',
          deltaX: 45,
          deltaY: 10,
          isSosActive: false,
        },
      ];

      // Guest / Public view
      const publicResult = DualTierSpatialPrivacy.filterLocations(records, UserRole.GUEST_VICTIM);
      expect(publicResult.detailedLocations).toBeUndefined();
      expect(publicResult.publicHeatmap).toBeDefined();
      expect(publicResult.publicHeatmap![0].hasActiveSos).toBe(true);
      expect(publicResult.publicHeatmap![0].clusterCount).toBe(2);

      // Verified Responder view
      const responderResult = DualTierSpatialPrivacy.filterLocations(records, UserRole.VERIFIED_RESPONDER);
      expect(responderResult.publicHeatmap).toBeUndefined();
      expect(responderResult.detailedLocations).toBeDefined();
      expect(responderResult.detailedLocations?.length).toBe(2);
      expect(responderResult.detailedLocations![0].res9Cell).toBe('8928308280fffff');
    });
  });
});
