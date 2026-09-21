/**
 * Epidemic Vaccine Kill Pill Engine (0x09: VACCINE_KILL_PILL)
 * Purges rescued/resolved emergency cases across the mesh within 100ms
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.4 & Sprint G Task G.3
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { BundleStore } from './BundleStore';

export const PACKET_TYPE_VACCINE_KILL_PILL = 0x09;

export interface IVaccineKillPillPacket {
  packetType: number;       // 0x09
  bundleId: string;
  authorityId: string;
  resolvedAt: number;
  authoritySignature: Uint8Array;
}

export class VaccineKillPillEngine {
  private bundleStore: BundleStore;
  private purgedBundleBlacklist: Set<string> = new Set();
  private authorityPublicKeys: Set<string> = new Set();

  constructor(bundleStore: BundleStore, authorizedKeys: string[] = []) {
    this.bundleStore = bundleStore;
    for (const key of authorizedKeys) {
      this.authorityPublicKeys.add(key);
    }
  }

  public registerAuthorityKey(key: string): void {
    this.authorityPublicKeys.add(key);
  }

  /**
   * Generates a signed Vaccine Kill Pill packet when rescue mission is accomplished
   */
  public createVaccine(
    bundleId: string,
    authorityId: string,
    signFn: (data: Uint8Array) => Uint8Array
  ): IVaccineKillPillPacket {
    const resolvedAt = Date.now();
    const data = new TextEncoder().encode(`${PACKET_TYPE_VACCINE_KILL_PILL}:${bundleId}:${authorityId}:${resolvedAt}`);
    const authoritySignature = signFn(data);

    // Immediately purge and blacklist locally
    this.purgedBundleBlacklist.add(bundleId);
    this.bundleStore.deleteBundle(bundleId);

    return {
      packetType: PACKET_TYPE_VACCINE_KILL_PILL,
      bundleId,
      authorityId,
      resolvedAt,
      authoritySignature
    };
  }

  /**
   * Ingests a Vaccine packet from peer or Data Mule, verifies authority signature,
   * and purges the target bundle from memory within 100ms.
   */
  public ingestVaccine(
    packet: IVaccineKillPillPacket,
    verifyFn: (data: Uint8Array, sig: Uint8Array, authorityId: string) => boolean
  ): boolean {
    if (packet.packetType !== PACKET_TYPE_VACCINE_KILL_PILL) {
      return false;
    }

    // Check if authority is recognized
    if (this.authorityPublicKeys.size > 0 && !this.authorityPublicKeys.has(packet.authorityId)) {
      return false; // Unauthorized vaccine issuer
    }

    const data = new TextEncoder().encode(
      `${PACKET_TYPE_VACCINE_KILL_PILL}:${packet.bundleId}:${packet.authorityId}:${packet.resolvedAt}`
    );

    const isValid = verifyFn(data, packet.authoritySignature, packet.authorityId);
    if (!isValid) {
      return false; // Signature forgery
    }

    // Add to blacklist to prevent future ingestion
    this.purgedBundleBlacklist.add(packet.bundleId);

    // Instant Purge: Delete from local bundle storage
    this.bundleStore.deleteBundle(packet.bundleId);
    return true;
  }

  /**
   * Checks whether bundle has been vaccinated/purged
   */
  public isVaccinated(bundleId: string): boolean {
    return this.purgedBundleBlacklist.has(bundleId);
  }

  public getBlacklistCount(): number {
    return this.purgedBundleBlacklist.size;
  }
}
