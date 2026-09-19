/**
 * Unit tests for CloudflareWorkerApi
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { CloudflareWorkerApi, type IApiRequest } from '../../../cloudflare/workers/index';
import { DigitalSignature } from '../../../src/core/crypto/DigitalSignature';

describe('CloudflareWorkerApi (Zero-Trust Edge Gateway)', () => {
  let api: CloudflareWorkerApi;
  const keyPair = DigitalSignature.generateKeyPair();

  beforeEach(() => {
    api = new CloudflareWorkerApi();
  });

  function makeSignedRequest(path: string, body: string, ts: number): IApiRequest {
    const msg = new TextEncoder().encode(`${path}:${ts}:${body}`);
    const signature = DigitalSignature.sign(msg, keyPair.privateKey);
    return {
      path,
      nodeId: 'rescue-node-01',
      publicKey: keyPair.publicKey,
      signature,
      timestamp: ts,
      body,
    };
  }

  it('should accept authentically signed requests within valid timestamp window', () => {
    const now = 100000;
    const req = makeSignedRequest('/api/v1/sync', '{"h3Tile":"8828308281fffff"}', now);

    const res = api.handleRequest(req, now);
    expect(res.status).toBe(200);
  });

  it('should reject requests with expired timestamp (replay protection)', () => {
    const now = 200000;
    const expiredReq = makeSignedRequest('/api/v1/sync', '{}', now - 70000); // 70s ago

    const res = api.handleRequest(expiredReq, now);
    expect(res.status).toBe(401);
  });

  it('should enforce rate limiting (429) within 15 seconds', () => {
    const now = 300000;
    const req1 = makeSignedRequest('/api/v1/sync', '{}', now);
    expect(api.handleRequest(req1, now).status).toBe(200);

    // Immediate second request (5 seconds later)
    const req2 = makeSignedRequest('/api/v1/sync', '{}', now + 5000);
    const res2 = api.handleRequest(req2, now + 5000);
    expect(res2.status).toBe(429);
  });

  it('should reject requests with forged signatures', () => {
    const now = 400000;
    const req = makeSignedRequest('/api/v1/sync', 'clean', now);
    req.body = 'tampered-payload'; // Body changed without updating signature

    const res = api.handleRequest(req, now);
    expect(res.status).toBe(403);
  });
});
