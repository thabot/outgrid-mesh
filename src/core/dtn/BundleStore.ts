/**
 * DTN Bundle Store & Custody Engine
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.1
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IDtnBundle {
  id: string;
  bundleData: Uint8Array;
  priority: number;        // 0xF (SOS), 0x8 (Chat), 0x1 (Presence)
  createdAt: number;
  expiresAt: number;       // 5 to 7 days retention
  hopCount: number;
  isHopFrozen: boolean;
  destinationH3: bigint;
}

export class BundleStore {
  private bundles: Map<string, IDtnBundle> = new Map();

  /**
   * Stores a bundle in custody
   */
  public storeBundle(bundle: IDtnBundle): void {
    this.bundles.set(bundle.id, bundle);
  }

  /**
   * Retrieves bundle by ID
   */
  public getBundle(id: string): IDtnBundle | undefined {
    return this.bundles.get(id);
  }

  /**
   * Returns bundles that the peer node does not yet possess (Differential Exchange)
   */
  public getMissingBundlesForPeer(peerKnownBundleIds: Set<string>): IDtnBundle[] {
    const missing: IDtnBundle[] = [];
    const now = Date.now();

    for (const bundle of this.bundles.values()) {
      if (now < bundle.expiresAt && !peerKnownBundleIds.has(bundle.id)) {
        missing.push(bundle);
      }
    }

    return missing;
  }

  /**
   * Returns total stored bundle count
   */
  public count(): number {
    return this.bundles.size;
  }

  /**
   * Prunes expired bundles
   */
  public pruneExpired(now: number = Date.now()): number {
    let pruned = 0;
    for (const [id, bundle] of this.bundles.entries()) {
      if (now >= bundle.expiresAt) {
        this.bundles.delete(id);
        pruned++;
      }
    }
    return pruned;
  }
}
