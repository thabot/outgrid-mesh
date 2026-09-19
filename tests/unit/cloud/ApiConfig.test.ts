import { describe, it, expect } from 'bun:test';
import { ApiConfig } from '../../../src/core/network/ApiConfig';

describe('ApiConfig - Task 9.5 Unit Tests', () => {
  it('should initialize with default Cloudflare zero-cost endpoints', () => {
    const apiConfig = new ApiConfig();
    const config = apiConfig.getConfig();

    expect(config.workerUrl).toBe('https://api.outgrid-mesh.workers.dev');
    expect(config.pagesUrl).toBe('https://outgrid-rescue.pages.dev');
    expect(config.isCustom).toBe(false);
    expect(config.timeoutMs).toBe(5000);
    expect(config.retryAttempts).toBe(3);
  });

  it('should set custom private cloud endpoint correctly', () => {
    const apiConfig = new ApiConfig();
    const success = apiConfig.setCustomEndpoint('https://mesh-gw.rescue.or.th', 'https://rescue.or.th');

    expect(success).toBe(true);
    const config = apiConfig.getConfig();
    expect(config.workerUrl).toBe('https://mesh-gw.rescue.or.th');
    expect(config.pagesUrl).toBe('https://rescue.or.th');
    expect(config.isCustom).toBe(true);
    expect(apiConfig.getStatus().endpoint).toBe('https://mesh-gw.rescue.or.th');
  });

  it('should reject invalid custom URLs', () => {
    const apiConfig = new ApiConfig();
    const success = apiConfig.setCustomEndpoint('not-a-valid-url');

    expect(success).toBe(false);
    expect(apiConfig.getConfig().workerUrl).toBe(ApiConfig.DEFAULT_WORKER_URL);
  });

  it('should reset back to default Cloudflare endpoints', () => {
    const apiConfig = new ApiConfig();
    apiConfig.setCustomEndpoint('https://custom.mesh.internal');
    expect(apiConfig.getConfig().isCustom).toBe(true);

    apiConfig.resetToDefault();
    expect(apiConfig.getConfig().isCustom).toBe(false);
    expect(apiConfig.getConfig().workerUrl).toBe(ApiConfig.DEFAULT_WORKER_URL);
  });

  it('should resolve signaling and spatial URLs properly', () => {
    const apiConfig = new ApiConfig();
    expect(apiConfig.resolveSignalingUrl('/signal')).toBe('https://api.outgrid-mesh.workers.dev/signal');
    expect(apiConfig.resolveSignalingUrl('ws-connect')).toBe('https://api.outgrid-mesh.workers.dev/ws-connect');
    expect(apiConfig.resolveSpatialD1Url('8865234567fffff')).toBe('https://api.outgrid-mesh.workers.dev/spatial/8865234567fffff');
  });

  it('should export and import configuration JSON correctly', () => {
    const original = new ApiConfig();
    original.setCustomEndpoint('https://private-ops.ngo.org', 'https://portal.ngo.org');

    const json = original.exportJson();
    const loaded = new ApiConfig();
    const importSuccess = loaded.importJson(json);

    expect(importSuccess).toBe(true);
    expect(loaded.getConfig().workerUrl).toBe('https://private-ops.ngo.org');
    expect(loaded.getConfig().pagesUrl).toBe('https://portal.ngo.org');
    expect(loaded.getConfig().isCustom).toBe(true);
  });

  it('should track health status updates', () => {
    const apiConfig = new ApiConfig();
    expect(apiConfig.getStatus().online).toBe(false);

    apiConfig.updateHealth(true, 42);
    const status = apiConfig.getStatus();
    expect(status.online).toBe(true);
    expect(status.latencyMs).toBe(42);
    expect(status.lastChecked).not.toBeNull();
  });
});
