/**
 * Camera LED Flashlight Strobe Controller
 * Emits international optical Morse code SOS (... --- ...)
 * Includes thermal runaway protection and duty cycle cutoff
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Optical Emergency Beacon
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IFlashPattern {
  isOn: boolean;
  durationMs: number;
}

export class FlashlightStrobe {
  public static readonly DOT_DURATION_MS = 150;
  public static readonly DASH_DURATION_MS = 450;
  public static readonly SYMBOL_GAP_MS = 150;
  public static readonly LETTER_GAP_MS = 450;
  public static readonly SOS_LOOP_GAP_MS = 1500;

  // Maximum continuous strobe duration to prevent LED overheating (3 minutes)
  public static readonly MAX_CONTINUOUS_STROBE_MS = 180000;
  // Thermal cooldown period before allowing next strobe session (30 seconds)
  public static readonly THERMAL_COOLDOWN_MS = 30000;

  private isStrobing: boolean = false;
  private strobeStartTime: number = 0;
  private lastThermalCutoffTime: number = 0;
  private hardwareTorchState: boolean = false;

  /**
   * Generates discrete flash patterns for SOS (... --- ...)
   */
  public static generateSosPattern(): IFlashPattern[] {
    const pattern: IFlashPattern[] = [];

    // 'S': . . .
    for (let i = 0; i < 3; i++) {
      pattern.push({ isOn: true, durationMs: FlashlightStrobe.DOT_DURATION_MS });
      pattern.push({ isOn: false, durationMs: FlashlightStrobe.SYMBOL_GAP_MS });
    }
    pattern.push({ isOn: false, durationMs: FlashlightStrobe.LETTER_GAP_MS });

    // 'O': - - -
    for (let i = 0; i < 3; i++) {
      pattern.push({ isOn: true, durationMs: FlashlightStrobe.DASH_DURATION_MS });
      pattern.push({ isOn: false, durationMs: FlashlightStrobe.SYMBOL_GAP_MS });
    }
    pattern.push({ isOn: false, durationMs: FlashlightStrobe.LETTER_GAP_MS });

    // 'S': . . .
    for (let i = 0; i < 3; i++) {
      pattern.push({ isOn: true, durationMs: FlashlightStrobe.DOT_DURATION_MS });
      pattern.push({ isOn: false, durationMs: FlashlightStrobe.SYMBOL_GAP_MS });
    }
    pattern.push({ isOn: false, durationMs: FlashlightStrobe.SOS_LOOP_GAP_MS });

    return pattern;
  }

  /**
   * Activates SOS Strobe mode with thermal protection check
   */
  public startStrobe(now = Date.now()): boolean {
    if (now - this.lastThermalCutoffTime < FlashlightStrobe.THERMAL_COOLDOWN_MS) {
      // Still in thermal cooldown
      return false;
    }

    this.isStrobing = true;
    this.strobeStartTime = now;
    return true;
  }

  /**
   * Checks for thermal cutoff and updates torch state
   */
  public updateStrobeTick(now = Date.now()): { active: boolean; isThermalCutoff: boolean } {
    if (!this.isStrobing) {
      return { active: false, isThermalCutoff: false };
    }

    if (now - this.strobeStartTime >= FlashlightStrobe.MAX_CONTINUOUS_STROBE_MS) {
      this.stopStrobe();
      this.lastThermalCutoffTime = now;
      return { active: false, isThermalCutoff: true };
    }

    return { active: true, isThermalCutoff: false };
  }

  public stopStrobe(): void {
    this.isStrobing = false;
    this.hardwareTorchState = false;
  }

  public getIsStrobing(): boolean {
    return this.isStrobing;
  }

  public setHardwareTorch(on: boolean): void {
    this.hardwareTorchState = on;
  }

  public getHardwareTorch(): boolean {
    return this.hardwareTorchState;
  }
}
