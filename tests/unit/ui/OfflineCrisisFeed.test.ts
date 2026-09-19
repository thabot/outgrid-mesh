/**
 * Unit tests for OfflineCrisisFeed
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { CrisisFeedManager, CrisisUrgency, type ICrisisFeedItem } from '../../../src/core/feed/CrisisFeedManager';
import { DigitalSignature } from '../../../src/core/crypto/DigitalSignature';

describe('CrisisFeedManager (Offline Emergency Alerts & Digital Signature)', () => {
  it('should verify authentically signed broadcast and reject tampered alerts', () => {
    const authorityKeyPair = DigitalSignature.generateKeyPair();
    const feedMgr = new CrisisFeedManager();

    const id = 'alert-001';
    const urgency = CrisisUrgency.EVACUATE_IMMEDIATE;
    const title = 'เขื่อนแม่ขานชำรุด ให้อพยพขึ้นที่สูงทันที';
    const content = 'ระดับน้ำเพิ่มสูงขึ้น 2 เมตรภายใน 30 นาที';
    const timestamp = 1700000000000;

    const rawMessage = new TextEncoder().encode(`${id}:${urgency}:${title}:${content}:${timestamp}`);
    const validSignature = DigitalSignature.sign(rawMessage, authorityKeyPair.privateKey);

    const validAlert: ICrisisFeedItem = {
      id,
      senderAuthority: 'ปภ. เชียงใหม่ (DDPM)',
      senderPubkey: authorityKeyPair.publicKey,
      urgency,
      title,
      content,
      timestamp,
      signature: validSignature,
    };

    const isVerified = feedMgr.ingestFeedItem(validAlert);
    expect(isVerified).toBe(true);
    expect(feedMgr.getFeedItem(id)?.isVerified).toBe(true);

    // Tampered alert
    const tamperedAlert: ICrisisFeedItem = {
      ...validAlert,
      id: 'alert-tampered',
      title: 'ข่าวปลอม: ให้ทุกคนมารวมตัวที่สะพาน', // Altered content
    };

    const isTamperedVerified = feedMgr.ingestFeedItem(tamperedAlert);
    expect(isTamperedVerified).toBe(false);
    expect(feedMgr.getFeedItem('alert-tampered')?.isVerified).toBe(false);
  });

  it('should sort feed alerts with EVACUATE_IMMEDIATE prioritized at the top', () => {
    const feedMgr = new CrisisFeedManager();
    const keyPair = DigitalSignature.generateKeyPair();

    function makeItem(id: string, urgency: CrisisUrgency, ts: number): ICrisisFeedItem {
      const msg = new TextEncoder().encode(`${id}:${urgency}:Title:Content:${ts}`);
      return {
        id,
        senderAuthority: 'Test',
        senderPubkey: keyPair.publicKey,
        urgency,
        title: 'Title',
        content: 'Content',
        timestamp: ts,
        signature: DigitalSignature.sign(msg, keyPair.privateKey),
      };
    }

    feedMgr.ingestFeedItem(makeItem('item-info-new', CrisisUrgency.INFORMATIONAL, 5000));
    feedMgr.ingestFeedItem(makeItem('item-evac-old', CrisisUrgency.EVACUATE_IMMEDIATE, 1000));
    feedMgr.ingestFeedItem(makeItem('item-warning', CrisisUrgency.WARNING, 3000));

    const sorted = feedMgr.getSortedFeed();
    expect(sorted.length).toBe(3);
    // Highest urgency first
    expect(sorted[0].id).toBe('item-evac-old');
    expect(sorted[1].id).toBe('item-warning');
    expect(sorted[2].id).toBe('item-info-new');
  });
});
