/**
 * DTN Bundle Custody Transfer Protocol Manager
 * Implements 3-step custody handshake: CUSTODY_OFFERED -> CUSTODY_ACCEPT (0x08) -> CUSTODY_TRANSFERRED
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.1 & Sprint G Task G.2
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { BundleStore, IDtnBundle } from './BundleStore';

export const PACKET_TYPE_CUSTODY_ACCEPT = 0x08;

export interface ICustodyOffer {
  bundleId: string;
  sourceNodeId: string;
  targetNodeId: string;
  timestamp: number;
}

export interface ICustodyAcceptPacket {
  packetType: number;      // 0x08
  bundleId: string;
  acceptorNodeId: string;
  timestamp: number;
  digitalSignature: Uint8Array;
}

export class BundleCustodyManager {
  private localNodeId: string;
  private bundleStore: BundleStore;

  constructor(localNodeId: string, bundleStore: BundleStore) {
    this.localNodeId = localNodeId;
    this.bundleStore = bundleStore;
  }

  /**
   * Step 1: Initiates a custody offer to peer node
   */
  public createCustodyOffer(bundleId: string, targetNodeId: string): ICustodyOffer | null {
    const bundle = this.bundleStore.getBundle(bundleId);
    if (!bundle) return null;

    this.bundleStore.offerCustody(bundleId, targetNodeId);

    return {
      bundleId,
      sourceNodeId: this.localNodeId,
      targetNodeId,
      timestamp: Date.now()
    };
  }

  /**
   * Step 2: Receiving node accepts custody and produces 0x08 CUSTODY_ACCEPT packet with digital signature
   */
  public acceptCustodyOffer(
    bundle: IDtnBundle,
    signFn: (data: Uint8Array) => Uint8Array
  ): ICustodyAcceptPacket {
    // 1. Store bundle locally first
    const newBundle: IDtnBundle = {
      ...bundle,
      custodyState: 'HELD',
      custodianNodeId: this.localNodeId
    };
    this.bundleStore.storeBundle(newBundle);

    // 2. Generate signed acceptance receipt
    const timestamp = Date.now();
    const signPayload = new TextEncoder().encode(`${PACKET_TYPE_CUSTODY_ACCEPT}:${bundle.id}:${this.localNodeId}:${timestamp}`);
    const digitalSignature = signFn(signPayload);

    return {
      packetType: PACKET_TYPE_CUSTODY_ACCEPT,
      bundleId: bundle.id,
      acceptorNodeId: this.localNodeId,
      timestamp,
      digitalSignature
    };
  }

  /**
   * Step 3: Source node receives CUSTODY_ACCEPT, verifies signature, and releases local copy
   */
  public processCustodyAccept(
    acceptPacket: ICustodyAcceptPacket,
    verifyFn: (data: Uint8Array, signature: Uint8Array, pubKeyNodeId: string) => boolean
  ): boolean {
    if (acceptPacket.packetType !== PACKET_TYPE_CUSTODY_ACCEPT) {
      return false;
    }

    const bundle = this.bundleStore.getBundle(acceptPacket.bundleId);
    if (!bundle) {
      return false; // Bundle already transferred or unknown
    }

    const signPayload = new TextEncoder().encode(
      `${PACKET_TYPE_CUSTODY_ACCEPT}:${acceptPacket.bundleId}:${acceptPacket.acceptorNodeId}:${acceptPacket.timestamp}`
    );

    const isValid = verifyFn(signPayload, acceptPacket.digitalSignature, acceptPacket.acceptorNodeId);
    if (!isValid) {
      return false; // Signature forgery or corruption; retain custody
    }

    // Safely transfer and prune from source node
    return this.bundleStore.confirmTransfer(acceptPacket.bundleId);
  }
}
