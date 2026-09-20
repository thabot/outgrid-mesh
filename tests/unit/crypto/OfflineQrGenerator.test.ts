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

  it('should generate deterministic 25x25 matrix with finder patterns in corners', () => {
    const matrix = OfflineQrGenerator.generateMatrix('TEST_OFFLINE_PAYLOAD', 25);
    expect(matrix.length).toBe(25);
    expect(matrix[0].length).toBe(25);

    // Top-left finder center (3,3) must be true
    expect(matrix[3][3]).toBe(true);
    // Top-right finder center (3, 25-4 = 21) must be true
    expect(matrix[3][21]).toBe(true);
    // Bottom-left finder center (21, 3) must be true
    expect(matrix[21][3]).toBe(true);
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
