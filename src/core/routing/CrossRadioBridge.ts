/**
 * Cross-Radio Bridge & Ingress Deduplication Engine (BLE <-> LoRa <-> Wi-Fi)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { BloomFilter } from '../protocol/BloomFilter';
import type { ITOGPacket } from '../protocol/TOGPacket';

export type RadioInterfaceType = 'BLE_CODED' | 'BT_LEGACY' | 'LORA' | 'WIFI_DIRECT' | 'CELLULAR';

export interface IBridgedMessageRecord {
  messageId: bigint;
  ingressRadio: RadioInterfaceType;
  receivedAt: number;
}

export class CrossRadioBridge {
  private bloomFilter: BloomFilter;
  private lruCache: Map<string, IBridgedMessageRecord> = new Map();
  private maxCacheSize: number;

  constructor(maxCacheSize = 1000) {
    this.bloomFilter = new BloomFilter(2048, 4);
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Evaluates if a packet received on ingressRadio is novel (not seen before).
   * If novel: records to Bloom Filter & LRU cache, returns true (allow bridging).
   * If duplicate: returns false (suppress echo storm).
   */
  public handleIngressPacket(messageId: bigint, ingressRadio: RadioInterfaceType): boolean {
    const key = messageId.toString();

    // 1. Fast path check: Bloom filter
    if (this.bloomFilter.has(messageId)) {
      // Confirm with LRU cache
      if (this.lruCache.has(key)) {
        return false; // Confirmed duplicate
      }
    }

    // 2. Novel packet: record it
    this.bloomFilter.add(messageId);

    // Evict oldest if full
    if (this.lruCache.size >= this.maxCacheSize) {
      const oldestKey = this.lruCache.keys().next().value;
      if (oldestKey) {
        this.lruCache.delete(oldestKey);
      }
    }

    this.lruCache.set(key, {
      messageId,
      ingressRadio,
      receivedAt: Date.now()
    });

    return true;
  }

  /**
   * Determines eligible egress radio interfaces for packet forwarding
   * Rule: Do not echo back onto the same radio interface it arrived on!
   */
  public getEligibleEgressRadios(
    messageId: bigint,
    availableRadios: RadioInterfaceType[]
  ): RadioInterfaceType[] {
    const record = this.lruCache.get(messageId.toString());
    if (!record) {
      return availableRadios;
    }

    // Filter out the ingress radio to prevent loopback echo
    return availableRadios.filter((r) => r !== record.ingressRadio);
  }

  public getCacheSize(): number {
    return this.lruCache.size;
  }

  public clear(): void {
    this.lruCache.clear();
    this.bloomFilter = new BloomFilter(2048, 4);
  }
}
