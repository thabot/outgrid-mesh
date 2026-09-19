/**
 * Network Healing & Re-Anchoring Engine
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.4
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { BundleStore, IDtnBundle } from './BundleStore';

export class NetworkHealingEngine {
  private bundleStore: BundleStore;
  private isOnline: boolean = false;

  constructor(bundleStore: BundleStore) {
    this.bundleStore = bundleStore;
  }

  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  /**
   * Automatically flushes all accumulated DTN bundles to Cloudflare coordinator
   * as soon as node re-enters network/cellular coverage
   */
  public async flushToCloudCoordinator(
    uploadFn: (bundle: IDtnBundle) => Promise<boolean>
  ): Promise<{ uploadedCount: number; failedCount: number }> {
    if (!this.isOnline) {
      return { uploadedCount: 0, failedCount: 0 };
    }

    let uploadedCount = 0;
    let failedCount = 0;
    const all = this.bundleStore.getMissingBundlesForPeer(new Set());

    for (const bundle of all) {
      try {
        const success = await uploadFn(bundle);
        if (success) {
          uploadedCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    return { uploadedCount, failedCount };
  }
}
