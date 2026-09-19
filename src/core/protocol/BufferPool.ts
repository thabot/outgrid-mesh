/**
 * Zero-Allocation Memory Buffer Pool
 * Recycles Uint8Array buffers to prevent Garbage Collection (GC) stutter on low-end devices
 * Protocol: TOG v1.1 Foundation
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export class BufferPool {
  private static instance: BufferPool;
  private pool256: Uint8Array[] = [];
  private pool512: Uint8Array[] = [];
  private pool1024: Uint8Array[] = [];
  private readonly maxPoolSize = 64;

  private constructor() {
    // Pre-warm pools
    for (let i = 0; i < 16; i++) {
      this.pool256.push(new Uint8Array(256));
      this.pool512.push(new Uint8Array(512));
      this.pool1024.push(new Uint8Array(1024));
    }
  }

  public static getInstance(): BufferPool {
    if (!BufferPool.instance) {
      BufferPool.instance = new BufferPool();
    }
    return BufferPool.instance;
  }

  /**
   * Acquires a buffer of at least the requested size
   */
  public acquire(minSize: number): Uint8Array {
    if (minSize <= 256) {
      return this.pool256.pop() || new Uint8Array(256);
    } else if (minSize <= 512) {
      return this.pool512.pop() || new Uint8Array(512);
    } else if (minSize <= 1024) {
      return this.pool1024.pop() || new Uint8Array(1024);
    }
    return new Uint8Array(minSize);
  }

  /**
   * Releases a buffer back into the recycling pool
   */
  public release(buf: Uint8Array): void {
    const len = buf.byteLength;
    buf.fill(0); // Zero out memory for security

    if (len === 256 && this.pool256.length < this.maxPoolSize) {
      this.pool256.push(buf);
    } else if (len === 512 && this.pool512.length < this.maxPoolSize) {
      this.pool512.push(buf);
    } else if (len === 1024 && this.pool1024.length < this.maxPoolSize) {
      this.pool1024.push(buf);
    }
  }

  public getAvailableCounts(): { c256: number; c512: number; c1024: number } {
    return {
      c256: this.pool256.length,
      c512: this.pool512.length,
      c1024: this.pool1024.length
    };
  }
}
