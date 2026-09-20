/**
 * Unit tests for NetworkStateEngine (Sprint D Task D.4)
 * Verifies 4-mode network state machine, 5-second grace period fallback, and flapping protection
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Network State Machine
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ModeStateMachine, AppOperatingMode } from '../../../src/core/state/ModeStateMachine';

describe('NetworkStateEngine (Sprint D Task D.4 State Machine & Flapping Guard)', () => {
  let stateMachine: ModeStateMachine;

  beforeEach(() => {
    stateMachine = new ModeStateMachine(AppOperatingMode.NORMAL_CLOUD);
  });

  it('should not immediately switch to DISASTER_MESH on momentary connection drops (<5s)', () => {
    const t0 = 1000000;
    stateMachine.updateConnectivity(false, t0);

    // 2 seconds disconnected -> Grace period active, still NORMAL_CLOUD
    stateMachine.checkGracePeriod(t0 + 2000);
    expect(stateMachine.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);

    // 4.5 seconds disconnected -> Still NORMAL_CLOUD
    stateMachine.checkGracePeriod(t0 + 4500);
    expect(stateMachine.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);
  });

  it('should engage DISASTER_MESH mode after full 5-second grace period expires', () => {
    const t0 = 1000000;
    stateMachine.updateConnectivity(false, t0);

    // At 5.0 seconds -> Engages DISASTER_MESH
    stateMachine.checkGracePeriod(t0 + 5000);
    expect(stateMachine.getOperatingMode()).toBe(AppOperatingMode.DISASTER_MESH);
  });

  it('should instantly recover to NORMAL_CLOUD when internet returns, bypassing delay', () => {
    const t0 = 1000000;
    stateMachine.updateConnectivity(false, t0);
    stateMachine.checkGracePeriod(t0 + 5000); // Mode is now DISASTER_MESH

    // Internet back!
    stateMachine.updateConnectivity(true, t0 + 6000);
    expect(stateMachine.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);
  });

  it('should guard against network flapping when connection blinks repeatedly within 3s', () => {
    const t0 = 1000000;

    // Drop 1s -> Recover -> Drop 2s -> Recover
    stateMachine.updateConnectivity(false, t0);
    stateMachine.updateConnectivity(true, t0 + 1000);
    stateMachine.updateConnectivity(false, t0 + 2000);
    stateMachine.updateConnectivity(true, t0 + 3500);

    // Should remain in NORMAL_CLOUD because no single drop exceeded 5000ms
    expect(stateMachine.getOperatingMode()).toBe(AppOperatingMode.NORMAL_CLOUD);
  });
});
