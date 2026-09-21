/**
 * BleGattSessionManager (Quick-GATT Session for BT 4.2 Legacy Devices)
 * Handles safe MTU clamping (<= 182B), 2.5s watchdog timeout, and exponential backoff
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IGattSessionConfig {
  maxSafeMtu: number;       // Safe limit: 185B - 3B ATT header = 182B payload
  sessionWatchdogMs: number; // 2500ms max session lifespan
  initialBackoffMs: number;  // 1000ms
  maxRetries: number;        // 3
}

export class BleGattSessionManager {
  private config: IGattSessionConfig;
  private activeSessions: Map<string, { startedAt: number; timer: any }> = new Map();

  constructor(config?: Partial<IGattSessionConfig>) {
    this.config = {
      maxSafeMtu: config?.maxSafeMtu ?? 182,
      sessionWatchdogMs: config?.sessionWatchdogMs ?? 2500,
      initialBackoffMs: config?.initialBackoffMs ?? 1000,
      maxRetries: config?.maxRetries ?? 3
    };
  }

  /**
   * Clamps negotiated MTU down to safe payload boundary
   */
  public clampMtu(negotiatedMtu: number): number {
    const rawSafeMtu = Math.min(negotiatedMtu, 185);
    const payloadSafe = Math.max(20, rawSafeMtu - 3); // 3 bytes ATT header overhead
    return Math.min(payloadSafe, this.config.maxSafeMtu);
  }

  /**
   * Calculates exponential backoff delay to prevent Error 133
   */
  public calculateBackoffDelay(retryAttempt: number): number {
    const exponent = Math.max(0, retryAttempt);
    return this.config.initialBackoffMs * Math.pow(2, exponent);
  }

  /**
   * Opens watchdog-protected session
   */
  public startSession(peerId: string, onTimeout: () => void): void {
    if (this.activeSessions.has(peerId)) {
      this.closeSession(peerId);
    }

    const timer = setTimeout(() => {
      this.activeSessions.delete(peerId);
      onTimeout();
    }, this.config.sessionWatchdogMs);

    this.activeSessions.set(peerId, {
      startedAt: Date.now(),
      timer
    });
  }

  public closeSession(peerId: string): void {
    const session = this.activeSessions.get(peerId);
    if (session) {
      clearTimeout(session.timer);
      this.activeSessions.delete(peerId);
    }
  }

  public hasActiveSession(peerId: string): boolean {
    return this.activeSessions.has(peerId);
  }
}
