/**
 * Dynamic Hop Decay & Density Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Adaptive Density
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export class DynamicHopDecay {
  /**
   * Calculates optimal initial Hop count based on neighborhood node density
   * - Urban dense (> 10 neighbors): 3 - 7 hops (prevent broadcast storm)
   * - Suburban moderate (3 - 10 neighbors): 7 - 10 hops
   * - Rural sparse (< 3 neighbors): 12 - 15 hops (penetrate distant nodes)
   */
  public static calculateInitialHops(neighborCount: number, isEmergencySos = false): number {
    if (isEmergencySos) {
      // Emergency SOS gets boosted hops to ensure life safety in flood/disaster scenarios
      if (neighborCount > 15) return 10;
      if (neighborCount > 5) return 15;
      return 25; // Sparse rural/isolated emergency
    }

    if (neighborCount >= 15) {
      return 3; // Very dense city center
    } else if (neighborCount >= 8) {
      return 5; // Urban community
    } else if (neighborCount >= 3) {
      return 8; // Suburban
    } else {
      return 12; // Sparse rural village
    }
  }

  /**
   * Calculates hop penalty reduction based on RSSI link quality
   * Very weak RSSI (< -85 dBm) implies marginal edge connection, decay faster to avoid fringe loops
   */
  public static calculateDecayPenalty(currentTtl: number, rssiDbm: number): number {
    if (currentTtl <= 1) return 0;

    // Normal decay = 1 hop
    let decay = 1;

    // If signal is exceptionally weak (edge of range), apply penalty
    if (rssiDbm < -90) {
      decay = Math.min(currentTtl, 2); // Accelerate decay on unstable link
    }

    return Math.max(0, currentTtl - decay);
  }
}
