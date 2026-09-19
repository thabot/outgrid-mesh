/**
 * Mesh Domain Error Hierarchy
 * Protocol: TOG v1.1
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum MeshErrorCode {
  INVALID_MAGIC = 'INVALID_MAGIC',
  CORRUPTED_PACKET = 'CORRUPTED_PACKET',
  CRC_MISMATCH = 'CRC_MISMATCH',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  RADIO_UNAVAILABLE = 'RADIO_UNAVAILABLE',
  GPS_UNAVAILABLE = 'GPS_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  OUT_OF_BOUNDS = 'OUT_OF_BOUNDS',
  BUFFER_OVERFLOW = 'BUFFER_OVERFLOW'
}

export class MeshError extends Error {
  public readonly code: MeshErrorCode;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(code: MeshErrorCode, message: string, context?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'MeshError';
    this.code = code;
    this.timestamp = Date.now();
    this.context = context;
    Object.setPrototypeOf(this, MeshError.prototype);
  }
}
