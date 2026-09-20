/**
 * Emergency Beacon Controls
 * Coordinates high-intensity optical Morse flashlight, dual-frequency acoustic siren, and 5-min safety cutoff
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Survival Beacons
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export class EmergencyBeaconControls {
  public static readonly THERMAL_CUTOFF_MS = 300000; // 5 minutes strict thermal cutoff
  public static readonly SIREN_FREQ_LOW = 960;
  public static readonly SIREN_FREQ_HIGH = 1440;

  private isTorchActive: boolean = false;
  private isSirenActive: boolean = false;
  private isMuted: boolean = false;
  private torchStartTime: number | null = null;
  private currentSirenFrequency: number = EmergencyBeaconControls.SIREN_FREQ_LOW;

  public startPanicBeacon(now = Date.now()): void {
    this.startFlashlightMorse(now);
    this.startAcousticSiren();
  }

  public stopAllBeacons(): void {
    this.stopFlashlight();
    this.stopAcousticSiren();
  }

  public startFlashlightMorse(now = Date.now()): boolean {
    this.isTorchActive = true;
    this.torchStartTime = now;
    return true;
  }

  public stopFlashlight(): void {
    this.isTorchActive = false;
    this.torchStartTime = null;
  }

  public checkThermalCutoff(now = Date.now()): boolean {
    if (this.isTorchActive && this.torchStartTime !== null) {
      if (now - this.torchStartTime >= EmergencyBeaconControls.THERMAL_CUTOFF_MS) {
        this.stopFlashlight();
        return true; // Cutoff triggered
      }
    }
    return false;
  }

  public startAcousticSiren(): void {
    this.isSirenActive = true;
    this.isMuted = false;
  }

  public stopAcousticSiren(): void {
    this.isSirenActive = false;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public cycleSirenTone(): number {
    this.currentSirenFrequency =
      this.currentSirenFrequency === EmergencyBeaconControls.SIREN_FREQ_LOW
        ? EmergencyBeaconControls.SIREN_FREQ_HIGH
        : EmergencyBeaconControls.SIREN_FREQ_LOW;
    return this.currentSirenFrequency;
  }

  public isTorchOn(): boolean {
    return this.isTorchActive;
  }

  public isSirenOn(): boolean {
    return this.isSirenActive;
  }

  public isSirenMuted(): boolean {
    return this.isMuted;
  }

  public getSirenFrequency(): number {
    return this.currentSirenFrequency;
  }
}
