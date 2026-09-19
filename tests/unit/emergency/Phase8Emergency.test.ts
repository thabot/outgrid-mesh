/**
 * Phase 8: Emergency Sideload APK, Acoustic Morse Siren & Optical Strobe Unit Tests
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 8
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { LocalHttpServer } from '../../../src/core/emergency/LocalHttpServer';
import { AcousticMorseEngine } from '../../../src/core/emergency/AcousticMorseEngine';
import { FlashlightStrobe } from '../../../src/core/emergency/FlashlightStrobe';
import { FskDemodulator } from '../../../src/core/emergency/FskDemodulator';
import { MicroDnsServer } from '../../../src/core/emergency/MicroDnsServer';

describe('Phase 8: Emergency Sideload APK, Acoustic Morse Siren & Optical Strobe', () => {
  describe('Task 8.1: Offline APK Sideloading Micro HTTP Server & Captive Portal', () => {
    let server: LocalHttpServer;
    const fakeApk = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]); // Zip PK header

    beforeEach(() => {
      server = new LocalHttpServer(8080);
      server.setApkPayload(fakeApk, 'outgrid-rescue.apk');
      server.start();
    });

    it('should serve direct APK binary download with application/vnd.android.package-archive', () => {
      const resp = server.handleRequest({ method: 'GET', url: '/download/apk' });
      expect(resp.statusCode).toBe(200);
      expect(resp.contentType).toBe('application/vnd.android.package-archive');
      expect(resp.body).toEqual(fakeApk);
      expect(resp.contentLength).toBe(fakeApk.length);
    });

    it('should serve HTML web portal landing page for in-browser visitors on port 8080', () => {
      const resp = server.handleRequest({ method: 'GET', url: '/' });
      expect(resp.statusCode).toBe(200);
      expect(resp.contentType).toContain('text/html');
      expect(typeof resp.body === 'string' && resp.body.includes('OutGrid Rescue')).toBe(true);
    });

    it('should handle DNS captive portal interception and redirect probes to local IP', () => {
      const dns = new MicroDnsServer('192.168.49.1');
      dns.start();

      const resolved = dns.resolveQuery({
        id: 0x544f,
        domain: 'connectivitycheck.gstatic.com',
        type: 'A',
      });
      expect(resolved.ip).toBe('192.168.49.1');

      const redirectResp = dns.handleCaptivePortalProbe('/generate_204');
      expect(redirectResp.statusCode).toBe(302);
      expect(redirectResp.redirectUrl).toBe('http://192.168.49.1:8080/');
    });
  });

  describe('Task 8.2: Acoustic Audio Morse Siren & Ultrasonic FSK Sub-Surface Rescue', () => {
    it('should encode SOS message into valid Morse audio tones sequence', () => {
      const tones = AcousticMorseEngine.encodeToMorseTones('SOS', 1000);
      expect(tones.length).toBeGreaterThan(0);

      const audibleTones = tones.filter(t => !t.isSilence);
      expect(audibleTones.length).toBe(9); // 3 dots, 3 dashes, 3 dots
    });

    it('should generate continuous frequency sweep siren (800Hz - 1800Hz) penetrating rubble', () => {
      const sweep = AcousticMorseEngine.generateSirenSweep(800, 1800, 1500, 50);
      expect(sweep.length).toBe(31); // (1500 / 50) + 1
      expect(sweep[0].frequency).toBe(800);
      expect(sweep[sweep.length - 1].frequency).toBe(1800);
    });

    it('should demodulate ultrasonic audio signals via FSK demodulator', () => {
      const sampleRate = 48000;
      const blockSize = 480;

      function generateSineWave(freq: number): Float32Array {
        const arr = new Float32Array(blockSize);
        for (let i = 0; i < blockSize; i++) {
          arr[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
        }
        return arr;
      }

      const markSamples = generateSineWave(18500);
      const spaceSamples = generateSineWave(19500);

      expect(FskDemodulator.detectBit(markSamples)).toBe('1');
      expect(FskDemodulator.detectBit(spaceSamples)).toBe('0');
    });
  });

  describe('Task 8.3: Optical Emergency Strobe Torch with Thermal Safety Cutoff', () => {
    it('should generate standard international Morse SOS optical strobe pattern (... --- ...)', () => {
      const pattern = FlashlightStrobe.generateSosPattern();
      const litFlashes = pattern.filter(p => p.isOn);
      expect(litFlashes.length).toBe(9); // 3 dots + 3 dashes + 3 dots
    });

    it('should enforce strict thermal cutoff after 3 minutes continuous operation to protect LED hardware', () => {
      const strobe = new FlashlightStrobe();
      const t0 = 1000000;
      expect(strobe.startStrobe(t0)).toBe(true);

      const tick1 = strobe.updateStrobeTick(t0 + 120000);
      expect(tick1.active).toBe(true);
      expect(tick1.isThermalCutoff).toBe(false);

      const tick2 = strobe.updateStrobeTick(t0 + 180000);
      expect(tick2.active).toBe(false);
      expect(tick2.isThermalCutoff).toBe(true);
      expect(strobe.getIsStrobing()).toBe(false);

      // Should refuse restart during cooldown
      expect(strobe.startStrobe(t0 + 190000)).toBe(false);
      // Can restart after cooldown
      expect(strobe.startStrobe(t0 + 215000)).toBe(true);
    });
  });
});
