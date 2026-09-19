/**
 * Unit tests for ModeStateMachine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ModeStateMachine, AppOperatingMode, type IModeTransitionEvent } from '../../../src/core/state/ModeStateMachine';

describe('ModeStateMachine (5s Zero-Config Fallback)', () => {
  let sm: ModeStateMachine;

  beforeEach(() => {
    sm = new ModeStateMachine(AppOperatingMode.NORMAL_CLOUD);
  });

  it('should not immediately switch mode if disconnect is brief (< 5s)', () => {
    const t0 = 10000;
    sm.updateConnectivity(false, t0);

    // After 3 seconds -> still in NORMAL_CLOUD
    sm.checkGracePeriod(t0 + 3000);
    expect(sm.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);
    expect(sm.isMeshEngaged()).toBe(false);

    // Internet back at 4 seconds
    sm.updateConnectivity(true, t0 + 4000);
    expect(sm.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);
  });

  it('should automatically engage DISASTER_MESH after 5 seconds of lost connection', () => {
    const t0 = 20000;
    let transitionEvent: IModeTransitionEvent | null = null;
    sm.onTransition(e => {
      transitionEvent = e;
    });

    sm.updateConnectivity(false, t0);
    sm.checkGracePeriod(t0 + 5001); // Exceeded 5s grace period

    expect(sm.getOperatingMode()).toBe(AppOperatingMode.DISASTER_MESH);
    expect(sm.isMeshEngaged()).toBe(true);
    expect(transitionEvent).not.toBeNull();
    expect(transitionEvent?.previousMode).toBe(AppOperatingMode.NORMAL_CLOUD);
    expect(transitionEvent?.currentMode).toBe(AppOperatingMode.DISASTER_MESH);
  });

  it('should restore NORMAL_CLOUD automatically when internet recovers', () => {
    const t0 = 30000;
    sm.updateConnectivity(false, t0);
    sm.checkGracePeriod(t0 + 6000);
    expect(sm.getOperatingMode()).toBe(AppOperatingMode.DISASTER_MESH);

    // Reconnected
    sm.updateConnectivity(true, t0 + 10000);
    expect(sm.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);
    expect(sm.isMeshEngaged()).toBe(false);
  });
});
