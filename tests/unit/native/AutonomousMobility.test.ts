/**
 * Unit tests for AutonomousMobility
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AutonomousMobility } from '../../../src/core/native/AutonomousMobility';

describe('AutonomousMobility (Vehicle & Speed Detection)', () => {
  let mobility: AutonomousMobility;

  beforeEach(() => {
    mobility = new AutonomousMobility();
  });

  it('should remain inactive while stationary or walking (< 15 km/h)', () => {
    mobility.addSample({ timestamp: 1000, speedKmh: 4 });
    mobility.addSample({ timestamp: 2000, speedKmh: 5 });
    mobility.addSample({ timestamp: 3000, speedKmh: 4.5 });

    expect(mobility.getIsDataMuleActive()).toBe(false);
  });

  it('should automatically trigger Data Mule mode when vehicle speed >= 18 km/h', () => {
    mobility.addSample({ timestamp: 1000, speedKmh: 10 });
    mobility.addSample({ timestamp: 2000, speedKmh: 22 });
    mobility.addSample({ timestamp: 3000, speedKmh: 28 });
    mobility.addSample({ timestamp: 4000, speedKmh: 35 });

    expect(mobility.getIsDataMuleActive()).toBe(true);
  });

  it('should exit Data Mule mode when vehicle comes to a stop', () => {
    // Fast moving
    mobility.addSample({ timestamp: 1000, speedKmh: 30 });
    mobility.addSample({ timestamp: 2000, speedKmh: 35 });
    mobility.addSample({ timestamp: 3000, speedKmh: 40 });
    expect(mobility.getIsDataMuleActive()).toBe(true);

    // Stop
    mobility.addSample({ timestamp: 4000, speedKmh: 0 });
    mobility.addSample({ timestamp: 5000, speedKmh: 0 });
    mobility.addSample({ timestamp: 6000, speedKmh: 0 });
    expect(mobility.getIsDataMuleActive()).toBe(false);
  });
});
