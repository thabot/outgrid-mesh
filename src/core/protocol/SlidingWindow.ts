/**
 * Selective NACK & Backoff Sliding Window Engine
 * Formats DELIVERY_NACK (0x06) bitmasks and coordinates jittered retransmissions
 * Protocol: TOG v1.1 Wire Protocol
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface INackPacket {
  messageId: bigint;
  missingCount: number;
  missingIndices: number[];
}

export class SlidingWindow {
  /**
   * Encodes a list of missing chunk indices into a compact DELIVERY_NACK (0x06) payload
   */
  public static serializeNack(messageId: bigint, missingIndices: number[]): Uint8Array {
    // Layout: [Message_ID 8B] + [Missing_Count 2B] + [Indices 2B each]
    const count = missingIndices.length;
    const buf = new Uint8Array(10 + count * 2);
    const view = new DataView(buf.buffer);

    view.setBigUint64(0, messageId, false);
    view.setUint16(8, count, false);

    for (let i = 0; i < count; i++) {
      view.setUint16(10 + i * 2, missingIndices[i]!, false);
    }

    return buf;
  }

  /**
   * Deserializes raw DELIVERY_NACK payload
   */
  public static deserializeNack(buf: Uint8Array): INackPacket {
    if (buf.length < 10) {
      throw new Error(`Invalid NACK buffer size: ${buf.length} < 10`);
    }
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const messageId = view.getBigUint64(0, false);
    const missingCount = view.getUint16(8, false);

    const missingIndices: number[] = [];
    for (let i = 0; i < missingCount; i++) {
      const idx = view.getUint16(10 + i * 2, false);
      missingIndices.push(idx);
    }

    return { messageId, missingCount, missingIndices };
  }

  /**
   * Computes an Exponential Backoff delay with pseudo-random jitter (50–200ms)
   * to avoid packet collision storms among neighboring nodes
   */
  public static computeBackoffJitterMs(retryAttempt: number, minMs = 50, maxMs = 200): number {
    const baseBackoff = Math.min(1000, 50 * Math.pow(1.5, Math.min(retryAttempt, 5)));
    const randomJitter = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return Math.floor(baseBackoff + randomJitter);
  }
}
