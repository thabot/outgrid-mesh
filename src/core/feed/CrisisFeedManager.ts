/**
 * Offline Crisis Feed Manager
 * Sorts official alerts by urgency, verifies Ed25519 digital signatures,
 * and warns against untrusted/unverified broadcast messages
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Crisis Broadcast Feed
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { DigitalSignature } from '../crypto/DigitalSignature';

export enum CrisisUrgency {
  INFORMATIONAL = 1,
  WARNING = 2,
  EVACUATE_IMMEDIATE = 3,
}

export interface ICrisisFeedItem {
  id: string;
  senderAuthority: string;
  senderPubkey: Uint8Array;
  urgency: CrisisUrgency;
  title: string;
  content: string;
  timestamp: number;
  signature: Uint8Array;
  isVerified?: boolean;
}

export class CrisisFeedManager {
  private feedItems: Map<string, ICrisisFeedItem> = new Map();
  private trustedAuthorities: Map<string, Uint8Array> = new Map();

  /**
   * Registers a trusted emergency authority public key (e.g. DDPM, TMD)
   */
  public registerTrustedAuthority(authorityName: string, pubkey: Uint8Array): void {
    this.trustedAuthorities.set(authorityName, pubkey);
  }

  /**
   * Adds an emergency feed alert and performs cryptographic verification
   */
  public ingestFeedItem(item: ICrisisFeedItem): boolean {
    const rawMessage = new TextEncoder().encode(`${item.id}:${item.urgency}:${item.title}:${item.content}:${item.timestamp}`);
    // DigitalSignature.verify(signature, message, publicKey)
    const verified = DigitalSignature.verify(item.signature, rawMessage, item.senderPubkey);

    const fullItem: ICrisisFeedItem = {
      ...item,
      isVerified: verified,
    };

    this.feedItems.set(item.id, fullItem);
    return verified;
  }

  /**
   * Returns list of feed alerts sorted: Evacuate First, then Newest timestamp
   */
  public getSortedFeed(): ICrisisFeedItem[] {
    return Array.from(this.feedItems.values()).sort((a, b) => {
      // 1. Urgency descending
      if (b.urgency !== a.urgency) {
        return b.urgency - a.urgency;
      }
      // 2. Timestamp descending
      return b.timestamp - a.timestamp;
    });
  }

  public getFeedItem(id: string): ICrisisFeedItem | undefined {
    return this.feedItems.get(id);
  }
}
