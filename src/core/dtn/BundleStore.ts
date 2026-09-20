/**
 * DTN Bundle Store & Custody Engine
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.1
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export type BundleCustodyState = 'HELD' | 'OFFERED' | 'TRANSFERRED';

export interface IDtnBundle {
  id: string;
  bundleData: Uint8Array;
  priority: number;        // 0xF (SOS), 0x8 (Chat), 0x1 (Presence)
  createdAt: number;
  expiresAt: number;       // 5 to 7 days retention
  hopCount: number;
  isHopFrozen: boolean;
  destinationH3: bigint;
  triageLevel?: number;    // 0x01 = Red SOS (Critical life), 0x02 = Yellow (Chat/Notice), 0x03 = Green (Low priority)
  custodyState?: BundleCustodyState;
  custodianNodeId?: string;
  signature?: Uint8Array;
}

export class BundleStore {
  public static readonly MAX_STORAGE_BYTES = 30 * 1024 * 1024; // 30 MB
  public static readonly MAX_BUNDLE_COUNT = 1000;

  private bundles: Map<string, IDtnBundle> = new Map();

  /**
   * Stores a bundle in custody, enforcing Triage Eviction if needed
   */
  public storeBundle(bundle: IDtnBundle): void {
    if (!bundle.custodyState) {
      bundle.custodyState = 'HELD';
    }
    if (!bundle.triageLevel) {
      bundle.triageLevel = bundle.priority === 0x0F ? 0x01 : 0x02;
    }

    this.bundles.set(bundle.id, bundle);
    this.enforceTriageEviction();
  }

  /**
   * Retrieves bundle by ID
   */
  public getBundle(id: string): IDtnBundle | undefined {
    return this.bundles.get(id);
  }

  /**
   * Deletes a bundle (e.g. after custody transfer or vaccine kill pill)
   */
  public deleteBundle(id: string): boolean {
    return this.bundles.delete(id);
  }

  /**
   * Updates custody state to OFFERED
   */
  public offerCustody(id: string, targetNodeId: string): boolean {
    const bundle = this.bundles.get(id);
    if (!bundle) return false;
    bundle.custodyState = 'OFFERED';
    bundle.custodianNodeId = targetNodeId;
    return true;
  }

  /**
   * Confirms custody transfer and removes bundle from local store
   */
  public confirmTransfer(id: string): boolean {
    const bundle = this.bundles.get(id);
    if (!bundle) return false;
    bundle.custodyState = 'TRANSFERRED';
    return this.bundles.delete(id);
  }

  /**
   * Prioritized Triage Eviction Policy:
   * Evicts low priority bundles when storage exceeds limit.
   * STRICT LIFE-SAFETY INVARIANT: RED SOS (0x01) CAN NEVER BE EVICTED (100% Retained).
   */
  public enforceTriageEviction(maxCount = BundleStore.MAX_BUNDLE_COUNT): number {
    if (this.bundles.size <= maxCount) return 0;

    let evictedCount = 0;
    const sorted = Array.from(this.bundles.values()).sort((a, b) => {
      const triageA = a.triageLevel ?? 2;
      const triageB = b.triageLevel ?? 2;
      // Higher triage number = lower priority (3 Green evicted before 2 Yellow)
      if (triageB !== triageA) {
        return triageB - triageA;
      }
      return a.createdAt - b.createdAt; // Older first
    });

    for (const b of sorted) {
      if (this.bundles.size <= maxCount) break;

      // STRICT LIFE-CRITICAL GUARANTEE: Never evict Red SOS (0x01)
      if (b.triageLevel === 0x01 || b.priority === 0x0F) {
        continue;
      }

      this.bundles.delete(b.id);
      evictedCount++;
    }

    return evictedCount;
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
   * Prunes expired bundles (Red SOS is retained up to full TTL)
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

