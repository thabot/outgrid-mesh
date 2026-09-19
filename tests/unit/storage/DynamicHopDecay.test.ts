/**
 * Unit tests for DynamicHopDecay (Hop 3-7 Urban vs 12-15 Rural & RSSI Penalty)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { DynamicHopDecay } from '../../../src/core/routing/DynamicHopDecay';

describe('DynamicHopDecay (Adaptive Density & RSSI Hop Decay)', () => {
  it('should assign compact hops in dense urban environments (3 - 7 hops)', () => {
    const denseHops = DynamicHopDecay.calculateInitialHops(20);
    expect(denseHops).toBe(3);

    const moderateHops = DynamicHopDecay.calculateInitialHops(10);
    expect(moderateHops).toBe(5);
  });

  it('should expand hops in sparse rural environments (12 - 25 hops)', () => {
    const ruralHops = DynamicHopDecay.calculateInitialHops(1);
    expect(ruralHops).toBe(12);

    // Emergency SOS gets boosted hops (25 for rural/isolated flood zone)
    const ruralSosHops = DynamicHopDecay.calculateInitialHops(1, true);
    expect(ruralSosHops).toBe(25);

    const moderateSosHops = DynamicHopDecay.calculateInitialHops(8, true);
    expect(moderateSosHops).toBe(15);

    const denseSosHops = DynamicHopDecay.calculateInitialHops(20, true);
    expect(denseSosHops).toBe(10);
  });

  it('should apply faster decay penalty on weak fringe RSSI links (< -90 dBm)', () => {
    // Strong link (-60 dBm): Normal decay by 1
    const normalHop = DynamicHopDecay.calculateDecayPenalty(6, -60);
    expect(normalHop).toBe(5);

    // Weak fringe link (-95 dBm): Penalty decay by 2
    const penalizedHop = DynamicHopDecay.calculateDecayPenalty(6, -95);
    expect(penalizedHop).toBe(4);
  });
});
