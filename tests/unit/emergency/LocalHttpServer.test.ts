/**
 * Unit tests for LocalHttpServer
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalHttpServer } from '../../../src/core/emergency/LocalHttpServer';

describe('LocalHttpServer (Offline APK Sideload)', () => {
  let server: LocalHttpServer;
  const dummyApk = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00]); // Zip magic

  beforeEach(() => {
    server = new LocalHttpServer(8080);
    server.setApkPayload(dummyApk, 'outgrid-rescue.apk');
    server.start();
  });

  it('should serve HTML landing page on root / path', () => {
    const res = server.handleRequest({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.contentType).toBe('text/html; charset=utf-8');
    expect(typeof res.body).toBe('string');
    expect((res.body as string).includes('OutGrid Rescue')).toBe(true);
    expect((res.body as string).includes('/download/apk')).toBe(true);
  });

  it('should serve APK file download on /download/apk endpoint', () => {
    const res = server.handleRequest({ method: 'GET', url: '/download/apk' });
    expect(res.statusCode).toBe(200);
    expect(res.contentType).toBe('application/vnd.android.package-archive');
    expect(res.contentLength).toBe(dummyApk.length);
    expect(res.body).toEqual(dummyApk);
    expect(res.headers?.['Content-Disposition']).toBe('attachment; filename="outgrid-rescue.apk"');
  });

  it('should return 404 when APK is not loaded', () => {
    const emptyServer = new LocalHttpServer(8080);
    emptyServer.start();
    const res = emptyServer.handleRequest({ method: 'GET', url: '/download/apk' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 503 if server is stopped', () => {
    server.stop();
    const res = server.handleRequest({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(503);
  });
});
