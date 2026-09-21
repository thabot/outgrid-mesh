/**
 * Thabot OutGrid Protocol (TOG v1.1) Cross-Radio LoRa Bridge Forwarding Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Wire Format Section 7 (BLE <-> LoRa Bridge Invariants)
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { TOGPacketType } from './TOGPacket';
import { CRC16 } from './CRC16';

export interface IBridgeForwardResult {
  forwarded: boolean;
  reason: 'FORWARDED_LORA' | 'DROPPED_DUPLICATE' | 'DROPPED_FORBIDDEN_MEDIA' | 'DROPPED_RATE_LIMITED' | 'DROPPED_TTL_EXPIRED' | 'DROPPED_CORRUPTED_CRC';
  transmittedBytes?: Uint8Array;
  cadBackoffMs?: number;
  remainingHopCount?: number;
}

export interface IBridgeConfig {
  dedupWindowMs?: number;       // Default 60,000 ms (60 seconds)
  maxCacheEntries?: number;     // Default 64 entries LRU
  presenceIntervalMs?: number;  // Default 60,000 ms per H3 Cell
  cadBusyProbability?: number;  // For simulation: probability of channel busy (0.0 - 1.0)
}

/**
 * TogBridgeRelay handles autonomous cross-radio bridging between
 * short-range BLE 2.4GHz broadcasts and long-range LoRa AS923 (920-925MHz) backbone.
 */
export class TogBridgeRelay {
  private readonly dedupWindowMs: number;
  private readonly maxCacheEntries: number;
  private readonly presenceIntervalMs: number;
  private readonly cadBusyProbability: number;

  // LRU Deduplication Cache: Map<hashKey, timestampMs>
  private readonly dedupCache: Map<string, number> = new Map();

  // Cell-based presence rate limiter: Map<cellH3, lastChirpTimestampMs>
  private readonly cellChirpTimestamps: Map<number, number> = new Map();

  constructor(config?: IBridgeConfig) {
    this.dedupWindowMs = config?.dedupWindowMs ?? 60_000;
    this.maxCacheEntries = config?.maxCacheEntries ?? 64;
    this.presenceIntervalMs = config?.presenceIntervalMs ?? 60_000;
    this.cadBusyProbability = config?.cadBusyProbability ?? 0;
  }

  /**
   * Generates an 8-character hex deduplication key from packet header and payload
   */
  public generatePacketKey(buffer: Uint8Array): string {
    if (buffer.length < 5) {
      return '00000000';
    }
    let hash = 0x811c9dc5;
    const len = Math.min(buffer.length, 16);
    for (let i = 0; i < len; i++) {
      hash ^= buffer[i];
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Clean up expired entries in dedup cache and enforce max entries
   */
  private pruneDedupCache(now: number): void {
    for (const [key, timestamp] of this.dedupCache.entries()) {
      if (now - timestamp > this.dedupWindowMs) {
        this.dedupCache.delete(key);
      }
    }
    while (this.dedupCache.size >= this.maxCacheEntries) {
      const oldestKey = this.dedupCache.keys().next().value;
      if (oldestKey) {
        this.dedupCache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  /**
   * Evaluates and forwards an inbound BLE packet to LoRa transmission
   * Enforces Zero-Payload Mutation, LRU Deduplication, and Traffic Prioritization.
   */
  public evaluateAndForward(rawBleBuffer: Uint8Array, now: number = Date.now()): IBridgeForwardResult {
    if (rawBleBuffer.length < 5) {
      return { forwarded: false, reason: 'DROPPED_CORRUPTED_CRC' };
    }

    // 1. Inspect packet type (first byte: 5 bits)
    const b0 = rawBleBuffer[0];
    const packetType = (b0 & 0x1f) as TOGPacketType;
    const hopCount = (b0 >> 5) & 0x07;

    // 2. Strict Media Chunk Blocking (Forbidden on LoRa)
    if (packetType === (0x02 as TOGPacketType) && rawBleBuffer.length > 70) {
      return { forwarded: false, reason: 'DROPPED_FORBIDDEN_MEDIA' };
    }

    // 3. Deduplication Check (LRU 64 slots, 60s window)
    this.pruneDedupCache(now);
    const packetKey = this.generatePacketKey(rawBleBuffer);
    const lastSeen = this.dedupCache.get(packetKey);
    if (lastSeen !== undefined && (now - lastSeen) < this.dedupWindowMs) {
      return { forwarded: false, reason: 'DROPPED_DUPLICATE' };
    }

    // 4. Rate-Limiting for Presence Chirp (0x07): max 1 chirp per 60s per H3 Cell
    if (packetType === TOGPacketType.PRESENCE_CHIRP) {
      if (rawBleBuffer.length >= 27) {
        const view = new DataView(rawBleBuffer.buffer, rawBleBuffer.byteOffset, rawBleBuffer.byteLength);
        const cellH3 = view.getUint32(5, false);
        const lastCellChirp = this.cellChirpTimestamps.get(cellH3);
        if (lastCellChirp !== undefined && (now - lastCellChirp) < this.presenceIntervalMs) {
          return { forwarded: false, reason: 'DROPPED_RATE_LIMITED' };
        }
        this.cellChirpTimestamps.set(cellH3, now);
      }
    }

    // 5. Hop Limit (TTL) check
    if (hopCount === 0 && packetType === TOGPacketType.PRESENCE_CHIRP) {
      return { forwarded: false, reason: 'DROPPED_TTL_EXPIRED' };
    }

    // 6. Zero-Payload Mutation Invariant:
    const forwardBuffer = new Uint8Array(rawBleBuffer);

    let remainingHop = hopCount;
    if (remainingHop > 0) {
      remainingHop -= 1;
      if (packetType === TOGPacketType.PRESENCE_CHIRP && forwardBuffer.length >= 27) {
        forwardBuffer[0] = (remainingHop << 5) | (packetType & 0x1f);
        const newCrc = CRC16.compute(forwardBuffer, 0, 25);
        const fView = new DataView(forwardBuffer.buffer, forwardBuffer.byteOffset, forwardBuffer.byteLength);
        fView.setUint16(25, newCrc & 0xffff, false);
      }
    }

    // 7. LoRa CAD Backoff Simulation
    let cadBackoffMs = 0;
    if (this.cadBusyProbability > 0 && Math.random() < this.cadBusyProbability) {
      cadBackoffMs = Math.floor(50 + Math.random() * 150);
    }

    // Record into Dedup Cache
    this.dedupCache.set(packetKey, now);

    return {
      forwarded: true,
      reason: 'FORWARDED_LORA',
      transmittedBytes: forwardBuffer,
      cadBackoffMs,
      remainingHopCount: remainingHop
    };
  }

  public getCacheSize(): number {
    return this.dedupCache.size;
  }

  public clearCache(): void {
    this.dedupCache.clear();
    this.cellChirpTimestamps.clear();
  }
}
