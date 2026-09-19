/**
 * Cloudflare Worker API Gateway with Ed25519 Request Verification & Rate Limiting
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Zero-Trust Edge Gateway
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { DigitalSignature } from '../../src/core/crypto/DigitalSignature';

export interface IApiRequest {
  path: string;
  nodeId: string;
  publicKey: Uint8Array;
  signature: Uint8Array;
  timestamp: number;
  body: string;
}

export interface IApiResponse {
  status: number;
  body: string;
}

export class CloudflareWorkerApi {
  public static readonly RATE_LIMIT_WINDOW_MS = 15000; // 1 request per 15s per node
  public static readonly MAX_TIMESTAMP_DRIFT_MS = 60000; // 60s replay attack window

  private lastRequestTimes: Map<string, number> = new Map();

  /**
   * Dispatches incoming API request with strict authentication & rate checks
   */
  public handleRequest(req: IApiRequest, now = Date.now()): IApiResponse {
    // 1. Check timestamp freshness (Anti-Replay Attack)
    if (Math.abs(now - req.timestamp) > CloudflareWorkerApi.MAX_TIMESTAMP_DRIFT_MS) {
      return { status: 401, body: 'Timestamp out of acceptable sync window' };
    }

    // 2. Check rate limit
    const lastTime = this.lastRequestTimes.get(req.nodeId);
    if (lastTime && now - lastTime < CloudflareWorkerApi.RATE_LIMIT_WINDOW_MS) {
      return { status: 429, body: 'Rate limit exceeded: 1 request per 15s' };
    }

    // 3. Verify Ed25519 cryptographic signature
    const messageToVerify = new TextEncoder().encode(`${req.path}:${req.timestamp}:${req.body}`);
    const isValidSignature = DigitalSignature.verify(req.signature, messageToVerify, req.publicKey);
    if (!isValidSignature) {
      return { status: 403, body: 'Invalid Ed25519 signature' };
    }

    // Update rate limit timestamp
    this.lastRequestTimes.set(req.nodeId, now);

    // Route successfully verified request
    return { status: 200, body: JSON.stringify({ success: true, path: req.path }) };
  }
}
