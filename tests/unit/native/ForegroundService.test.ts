/**
 * Unit tests for ForegroundService
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ForegroundService } from '../../../src/core/native/ForegroundService';

describe('ForegroundService (Android 24/7 Persistence)', () => {
  let service: ForegroundService;

  beforeEach(() => {
    service = new ForegroundService();
  });

  it('should start foreground service with persistent emergency notification', () => {
    const notif = service.startForeground();
    expect(service.isRunning()).toBe(true);
    expect(notif.isOngoing).toBe(true);
    expect(notif.title.includes('OutGrid')).toBe(true);
  });

  it('should acquire and release partial WakeLock disciplined while running', () => {
    service.startForeground();
    expect(service.isWakeLockHeld()).toBe(false);

    const acquired = service.acquireWakeLock();
    expect(acquired).toBe(true);
    expect(service.isWakeLockHeld()).toBe(true);

    service.releaseWakeLock();
    expect(service.isWakeLockHeld()).toBe(false);
  });

  it('should refuse WakeLock if service is not running', () => {
    const acquired = service.acquireWakeLock();
    expect(acquired).toBe(false);
    expect(service.isWakeLockHeld()).toBe(false);
  });

  it('should automatically release WakeLock when foreground service stops', () => {
    service.startForeground();
    service.acquireWakeLock();
    expect(service.isWakeLockHeld()).toBe(true);

    service.stopForeground();
    expect(service.isRunning()).toBe(false);
    expect(service.isWakeLockHeld()).toBe(false);
  });
});
