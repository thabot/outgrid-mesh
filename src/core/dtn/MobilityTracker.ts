/**
 * Mobility & Velocity Azimuth Tracker
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.2
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IGpsFix {
  latitude: number;
  longitude: number;
  speedKmh: number;
  bearingDeg: number;
  timestamp: number;
}

export class MobilityTracker {
  private static readonly MULE_SPEED_MIN_KMH = 20.0;
  private static readonly MULE_SPEED_MAX_KMH = 80.0;

  private recentFixes: IGpsFix[] = [];

  public addFix(fix: IGpsFix): void {
    this.recentFixes.push(fix);
    if (this.recentFixes.length > 5) {
      this.recentFixes.shift();
    }
  }

  /**
   * Determines if device qualifies as High-Priority Data Mule (20 - 80 km/h)
   */
  public isHighPriorityMule(): boolean {
    if (this.recentFixes.length === 0) return false;
    const latest = this.recentFixes[this.recentFixes.length - 1];
    return latest.speedKmh >= MobilityTracker.MULE_SPEED_MIN_KMH &&
           latest.speedKmh <= MobilityTracker.MULE_SPEED_MAX_KMH;
  }

  /**
   * Calculates azimuth projection angle
   */
  public getCurrentBearing(): number {
    if (this.recentFixes.length === 0) return 0;
    return this.recentFixes[this.recentFixes.length - 1].bearingDeg;
  }
}
