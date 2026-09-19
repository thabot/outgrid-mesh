/**
 * Unit tests for MicroDnsServer
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MicroDnsServer } from '../../../src/core/emergency/MicroDnsServer';

describe('MicroDnsServer (Captive Portal DNS & HTTP Trap)', () => {
  let dns: MicroDnsServer;

  beforeEach(() => {
    dns = new MicroDnsServer('192.168.49.1');
    dns.start();
  });

  it('should redirect any external domain lookup to local IP', () => {
    const res = dns.resolveQuery({
      id: 0x1234,
      domain: 'google.com',
      type: 'A',
    });

    expect(res.id).toBe(0x1234);
    expect(res.domain).toBe('google.com');
    expect(res.ip).toBe('192.168.49.1');
    expect(res.ttl).toBe(60);
  });

  it('should detect Android captive portal probe and redirect to port 8080', () => {
    const probe = '/generate_204';
    expect(dns.isCaptivePortalProbe(probe)).toBe(true);

    const redirect = dns.handleCaptivePortalProbe(probe);
    expect(redirect.statusCode).toBe(302);
    expect(redirect.redirectUrl).toBe('http://192.168.49.1:8080/');
  });

  it('should detect Apple captive portal probe and redirect', () => {
    const probe = '/hotspot-detect.html';
    expect(dns.isCaptivePortalProbe(probe)).toBe(true);

    const redirect = dns.handleCaptivePortalProbe(probe);
    expect(redirect.statusCode).toBe(302);
    expect(redirect.redirectUrl).toBe('http://192.168.49.1:8080/');
  });

  it('should throw error when resolving query while stopped', () => {
    dns.stop();
    expect(() => {
      dns.resolveQuery({ id: 1, domain: 'test.com', type: 'A' });
    }).toThrow('DNS Server is not running');
  });
});
