/**
 * Common Alerting Protocol (CAP v1.2) Inbound Webhook Gateway
 * Parses XML/JSON disaster alerts from government authorities (DDPM / TMD)
 * Cryptographically signs with OutGrid Master Key for mesh distribution
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Inbound Alert Gateway
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { DigitalSignature } from '../../src/core/crypto/DigitalSignature';
import { CrisisUrgency, type ICrisisFeedItem } from '../../src/core/feed/CrisisFeedManager';

export interface ICapAlertInput {
  identifier: string;
  sender: string;
  sent: string;
  status: 'Actual' | 'Exercise' | 'Test';
  msgType: 'Alert' | 'Update' | 'Cancel';
  info: {
    urgency: 'Immediate' | 'Expected' | 'Future';
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
    headline: string;
    description: string;
  };
}

export class CapAlertIngestionGateway {
  private masterPrivateKey: Uint8Array;
  private masterPublicKey: Uint8Array;

  constructor(masterPrivateKey: Uint8Array, masterPublicKey: Uint8Array) {
    this.masterPrivateKey = masterPrivateKey;
    this.masterPublicKey = masterPublicKey;
  }

  /**
   * Translates incoming CAP alert into verified OutGrid Crisis Feed Item
   */
  public ingestCapAlert(cap: ICapAlertInput): ICrisisFeedItem {
    let urgency = CrisisUrgency.INFORMATIONAL;
    if (cap.info.urgency === 'Immediate' || cap.info.severity === 'Extreme') {
      urgency = CrisisUrgency.EVACUATE_IMMEDIATE;
    } else if (cap.info.severity === 'Severe') {
      urgency = CrisisUrgency.WARNING;
    }

    const timestamp = Date.parse(cap.sent) || Date.now();
    const title = cap.info.headline;
    const content = cap.info.description;

    const rawMsg = new TextEncoder().encode(`${cap.identifier}:${urgency}:${title}:${content}:${timestamp}`);
    const signature = DigitalSignature.sign(rawMsg, this.masterPrivateKey);

    return {
      id: cap.identifier,
      senderAuthority: cap.sender,
      senderPubkey: this.masterPublicKey,
      urgency,
      title,
      content,
      timestamp,
      signature,
      isVerified: true,
    };
  }
}
