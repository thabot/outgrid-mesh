import { describe, it, expect } from 'bun:test';
import { OfflineQrGenerator } from '../../../src/core/crypto/OfflineQrGenerator';

describe('OfflineQrGenerator (Sprint F Task F.1 Pure Offline QR Matrix & Level H)', () => {
  it('should generate valid contact pairing payload with node ID and keys', () => {
    const payload = OfflineQrGenerator.createContactPayload(
      'node-thabot-01',
      'ed_pub_abcdef123456',
      'x_pub_789012345678'
    );

    expect(payload.startsWith('OG:v1:PAIR:')).toBe(true);
    expect(payload).toContain('node-thabot-01');
    expect(payload).toContain('ed_pub_abcdef123456');
    expect(payload).toContain('x_pub_789012345678');
  });

  it('should generate Wi-Fi hotspot sideloading payload', () => {
    const payload = OfflineQrGenerator.createApkHotspotPayload('OutGrid-Rescue', 'sos12345', '192.168.49.1');
    expect(payload.startsWith('WIFI:S:OutGrid-Rescue;')).toBe(true);
    expect(payload).toContain('http://192.168.49.1:8080/app.apk');
  });

  it('should generate deterministic matrix with standard finder patterns in corners', () => {
    const matrix = OfflineQrGenerator.generateMatrix('TEST_OFFLINE_PAYLOAD');
    const size = matrix.length;
    expect(size).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(size);

    // Top-left finder center (3,3) must be true
    expect(matrix[3][3]).toBe(true);
    // Top-right finder center (3, size-4) must be true
    expect(matrix[3][size - 4]).toBe(true);
    // Bottom-left finder center (size-4, 3) must be true
    expect(matrix[size - 4][3]).toBe(true);
  });

  it('should render pure offline SVG with inverted and standard colors', () => {
    const standardSvg = OfflineQrGenerator.renderSvg('TEST_PAYLOAD', { inverted: false });
    expect(standardSvg).toContain('<svg');
    expect(standardSvg).toContain('fill="#000000"');

    const invertedSvg = OfflineQrGenerator.renderSvg('TEST_PAYLOAD', { inverted: true });
    expect(invertedSvg).toContain('<svg');
    expect(invertedSvg).toContain('fill="#38bdf8"');
  });
});
