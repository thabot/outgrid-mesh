/**
 * Reed-Solomon Forward Error Correction (Erasure Coding 8+4)
 * Galois Field GF(2^8) with Generator Polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
 * Allows 100% mathematical data recovery if up to 4 out of 12 shards (33.3%) are lost in air.
 * Protocol: TOG v1.1 Wire Protocol
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export class GaloisField256 {
  private static readonly EXP_TABLE = new Uint8Array(512);
  private static readonly LOG_TABLE = new Uint8Array(256);
  private static initialized = false;

  public static init(): void {
    if (this.initialized) return;
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.EXP_TABLE[i] = x;
      this.EXP_TABLE[i + 255] = x;
      this.LOG_TABLE[x] = i;
      x <<= 1;
      if (x & 0x100) {
        x ^= 0x11d; // Primitive polynomial 0x11D
      }
    }
    this.initialized = true;
  }

  public static add(a: number, b: number): number {
    return a ^ b;
  }

  public static mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    this.init();
    return this.EXP_TABLE[this.LOG_TABLE[a]! + this.LOG_TABLE[b]!]!;
  }

  public static div(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero in GF(2^8)');
    if (a === 0) return 0;
    this.init();
    let diff = this.LOG_TABLE[a]! - this.LOG_TABLE[b]!;
    if (diff < 0) diff += 255;
    return this.EXP_TABLE[diff]!;
  }
}

export interface IShard {
  index: number;
  isParity: boolean;
  data: Uint8Array;
}

export class ErasureCoder {
  public static readonly DATA_SHARDS = 8;
  public static readonly PARITY_SHARDS = 4;
  public static readonly TOTAL_SHARDS = 12;

  /**
   * Encodes raw payload into 8 Data Shards + 4 Parity Shards (Total 12)
   */
  public static encode(payload: Uint8Array): IShard[] {
    GaloisField256.init();
    const shardSize = Math.ceil(payload.length / this.DATA_SHARDS) || 1;
    const shards: IShard[] = [];

    // 1. Create 8 Data Shards
    for (let i = 0; i < this.DATA_SHARDS; i++) {
      const data = new Uint8Array(shardSize);
      const start = i * shardSize;
      const end = Math.min(payload.length, start + shardSize);
      if (start < payload.length) {
        data.set(payload.subarray(start, end), 0);
      }
      shards.push({ index: i, isParity: false, data });
    }

    // 2. Create 4 Cauchy parity shards using Cauchy matrix over GF(2^8)
    // Cauchy matrix C_ij = 1 / (x_i ^ y_j) where x_i and y_j are distinct subsets guarantees MDS property (any square submatrix is invertible)
    // Let x_i = i for i in [0..3], y_j = 4 + j for j in [0..7]
    for (let p = 0; p < this.PARITY_SHARDS; p++) {
      const parityData = new Uint8Array(shardSize);
      const xi = p;
      for (let byteIdx = 0; byteIdx < shardSize; byteIdx++) {
        let acc = 0;
        for (let d = 0; d < this.DATA_SHARDS; d++) {
          const yj = 16 + d; // ensure xi != yj always
          const coef = GaloisField256.div(1, xi ^ yj);
          const val = shards[d]!.data[byteIdx]!;
          acc = GaloisField256.add(acc, GaloisField256.mul(val, coef));
        }
        parityData[byteIdx] = acc;
      }
      shards.push({
        index: this.DATA_SHARDS + p,
        isParity: true,
        data: parityData
      });
    }

    return shards;
  }

  /**
   * Decodes and mathematically reconstructs the original payload if at least 8 shards survive
   * Returns original bytes or null if fewer than 8 shards survive.
   */
  public static decode(survivingShards: IShard[], originalLength: number): Uint8Array | null {
    if (survivingShards.length < this.DATA_SHARDS) {
      return null; // Cannot reconstruct with < 8 shards
    }

    GaloisField256.init();
    const shardSize = survivingShards[0]!.data.length;

    // Check if we already have all 8 data shards intact
    const dataShards = new Map<number, Uint8Array>();
    for (const s of survivingShards) {
      if (!s.isParity && s.index < this.DATA_SHARDS) {
        dataShards.set(s.index, s.data);
      }
    }

    if (dataShards.size === this.DATA_SHARDS) {
      // Direct concatenation
      const result = new Uint8Array(this.DATA_SHARDS * shardSize);
      for (let i = 0; i < this.DATA_SHARDS; i++) {
        result.set(dataShards.get(i)!, i * shardSize);
      }
      return result.subarray(0, originalLength);
    }

    // Gaussian Elimination Matrix Recovery
    // Take exactly 8 distinct surviving shards
    const selected = survivingShards.slice(0, this.DATA_SHARDS);
    
    // Build 8x8 equation matrix: M * Data = Observed
    const matrix: number[][] = [];
    for (let row = 0; row < this.DATA_SHARDS; row++) {
      const shard = selected[row]!;
      matrix[row] = [];
      if (!shard.isParity) {
        // Identity row for data shard
        for (let col = 0; col < this.DATA_SHARDS; col++) {
          matrix[row]![col] = shard.index === col ? 1 : 0;
        }
      } else {
        // Parity coefficient row (Cauchy MDS matrix)
        const p = shard.index - this.DATA_SHARDS;
        const xi = p;
        for (let col = 0; col < this.DATA_SHARDS; col++) {
          const yj = 16 + col;
          matrix[row]![col] = GaloisField256.div(1, xi ^ yj);
        }
      }
    }

    // Invert the 8x8 matrix via Gaussian Jordan elimination over GF(2^8)
    const inv = this.invertMatrix(matrix);
    if (!inv) return null;

    // Reconstruct data shards byte-by-byte
    const reconstructedDataShards: Uint8Array[] = [];
    for (let d = 0; d < this.DATA_SHARDS; d++) {
      reconstructedDataShards.push(new Uint8Array(shardSize));
    }

    for (let byteIdx = 0; byteIdx < shardSize; byteIdx++) {
      for (let d = 0; d < this.DATA_SHARDS; d++) {
        let acc = 0;
        for (let r = 0; r < this.DATA_SHARDS; r++) {
          const shardVal = selected[r]!.data[byteIdx]!;
          const invCoef = inv[d]![r]!;
          acc = GaloisField256.add(acc, GaloisField256.mul(shardVal, invCoef));
        }
        reconstructedDataShards[d]![byteIdx] = acc;
      }
    }

    const reconstructed = new Uint8Array(this.DATA_SHARDS * shardSize);
    for (let i = 0; i < this.DATA_SHARDS; i++) {
      reconstructed.set(reconstructedDataShards[i]!, i * shardSize);
    }

    return reconstructed.subarray(0, originalLength);
  }

  private static invertMatrix(m: number[][]): number[][] | null {
    const n = m.length;
    const a: number[][] = [];
    const inv: number[][] = [];

    for (let i = 0; i < n; i++) {
      a[i] = [...m[i]!];
      inv[i] = [];
      for (let j = 0; j < n; j++) {
        inv[i]![j] = i === j ? 1 : 0;
      }
    }

    for (let col = 0; col < n; col++) {
      // Find pivot
      let pivotRow = -1;
      for (let row = col; row < n; row++) {
        if (a[row]![col] !== 0) {
          pivotRow = row;
          break;
        }
      }
      if (pivotRow === -1) return null; // Singular matrix

      // Swap rows
      if (pivotRow !== col) {
        const tempA = a[col]!; a[col] = a[pivotRow]!; a[pivotRow] = tempA;
        const tempInv = inv[col]!; inv[col] = inv[pivotRow]!; inv[pivotRow] = tempInv;
      }

      // Scale pivot row to 1
      const pivotVal = a[col]![col]!;
      for (let j = 0; j < n; j++) {
        a[col]![j] = GaloisField256.div(a[col]![j]!, pivotVal);
        inv[col]![j] = GaloisField256.div(inv[col]![j]!, pivotVal);
      }

      // Eliminate other rows
      for (let row = 0; row < n; row++) {
        if (row !== col && a[row]![col] !== 0) {
          const factor = a[row]![col]!;
          for (let j = 0; j < n; j++) {
            a[row]![j] = GaloisField256.add(a[row]![j]!, GaloisField256.mul(factor, a[col]![j]!));
            inv[row]![j] = GaloisField256.add(inv[row]![j]!, GaloisField256.mul(factor, inv[col]![j]!));
          }
        }
      }
    }

    return inv;
  }
}
