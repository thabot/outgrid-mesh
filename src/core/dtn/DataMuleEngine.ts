/**
 * Autonomous Data Mule Engine
 * Manages DTN opportunistic bundle ingestion, transport, and automated cloud gateway upload
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.2 & Sprint G Task G.1
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { BundleStore, IDtnBundle } from './BundleStore';
import { MobilityTracker } from './MobilityTracker';

export enum DataMuleState {
  IDLE = 'IDLE',
  DATA_MULE_ACTIVE = 'DATA_MULE_ACTIVE',
  UNLOADING = 'UNLOADING'
}

export interface IExchangeResult {
  ingestedCount: number;
  offeredCount: number;
}

export class DataMuleEngine {
  private bundleStore: BundleStore;
  private tracker: MobilityTracker;
  private state: DataMuleState = DataMuleState.IDLE;
  private isOnline: boolean = false;
  private inShelterZone: boolean = false;

  constructor(bundleStore: BundleStore, tracker?: MobilityTracker) {
    this.bundleStore = bundleStore;
    this.tracker = tracker || new MobilityTracker();
  }

  public getTracker(): MobilityTracker {
    return this.tracker;
  }

  public getState(): DataMuleState {
    return this.state;
  }

  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    this.evaluateState();
  }

  public setShelterZone(inShelter: boolean): void {
    this.inShelterZone = inShelter;
    this.evaluateState();
  }

  /**
   * Updates GPS velocity and triggers state transitions
   */
  public updateSpeed(speedKmh: number, timestamp: number = Date.now()): void {
    this.tracker.updateMotion(speedKmh, 0, timestamp);
    this.evaluateState();
  }

  private evaluateState(): void {
    const isMule = this.tracker.isDataMuleActive();
    const isStationary = this.tracker.isStationary();

    if ((this.isOnline || this.inShelterZone) && isStationary && this.bundleStore.count() > 0) {
      this.state = DataMuleState.UNLOADING;
    } else if (isMule) {
      this.state = DataMuleState.DATA_MULE_ACTIVE;
    } else {
      this.state = DataMuleState.IDLE;
    }
  }

  /**
   * Performs Opportunistic Zero-Click Exchange with peer node within 50-100m
   */
  public performOpportunisticExchange(
    peerKnownBundleIds: Set<string>,
    peerIncomingBundles: IDtnBundle[]
  ): IExchangeResult {
    let ingestedCount = 0;

    // 1. Ingest bundles from peer (Zero-Click Ingestion)
    for (const bundle of peerIncomingBundles) {
      const existing = this.bundleStore.getBundle(bundle.id);
      if (!existing && Date.now() < bundle.expiresAt) {
        this.bundleStore.storeBundle(bundle);
        ingestedCount++;
      }
    }

    // 2. Offer our missing bundles to peer
    const offered = this.bundleStore.getMissingBundlesForPeer(peerKnownBundleIds);

    return {
      ingestedCount,
      offeredCount: offered.length
    };
  }

  /**
   * Flushes and unloads all bundles to Cloudflare Gateway once arrived at shelter/cellular coverage
   */
  public async unloadBundlesToGateway(
    uploaderFn: (bundle: IDtnBundle) => Promise<boolean>
  ): Promise<{ unloaded: number; failed: number }> {
    let unloaded = 0;
    let failed = 0;

    const bundles = this.bundleStore.getMissingBundlesForPeer(new Set());
    for (const bundle of bundles) {
      try {
        const ok = await uploaderFn(bundle);
        if (ok) {
          unloaded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    this.evaluateState();
    return { unloaded, failed };
  }
}
