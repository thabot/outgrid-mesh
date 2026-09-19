/**
 * Unit tests for CapAlertIngestionGateway
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { CapAlertIngestionGateway, type ICapAlertInput } from '../../../cloudflare/workers/capAlert';
import { DigitalSignature } from '../../../src/core/crypto/DigitalSignature';
import { CrisisUrgency } from '../../../src/core/feed/CrisisFeedManager';

describe('CapAlertIngestionGateway (CAP v1.2 Inbound Alert)', () => {
  it('should parse CAP Immediate/Extreme alert into EVACUATE_IMMEDIATE with valid master signature', () => {
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
    expect(feedItem.senderAuthority).toBe(capInput.sender);

    // Verify digital signature
    const rawMsg = new TextEncoder().encode(
      `${feedItem.id}:${feedItem.urgency}:${feedItem.title}:${feedItem.content}:${feedItem.timestamp}`
    );
    const isValid = DigitalSignature.verify(feedItem.signature, rawMsg, keyPair.publicKey);
    expect(isValid).toBe(true);
  });
});
