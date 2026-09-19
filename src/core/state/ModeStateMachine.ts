/**
 * Mode State Machine & 5-Second Zero-Config Fallback Engine
 * Automatically transitions between Cloud Edge mode and Disaster Mesh Mode
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Autonomous Mode Transition
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum AppOperatingMode {
  NORMAL_CLOUD = 'NORMAL_CLOUD',
  DISASTER_MESH = 'DISASTER_MESH',
  PHYSICAL_MULE = 'PHYSICAL_MULE',
}

export interface IModeTransitionEvent {
  previousMode: AppOperatingMode;
  currentMode: AppOperatingMode;
  reason: string;
  timestamp: number;
}

export class ModeStateMachine {
  public static readonly DISCONNECT_GRACE_PERIOD_MS = 5000; // Strict 5-second fallback

  private currentMode: AppOperatingMode = AppOperatingMode.NORMAL_CLOUD;
  private isInternetReachable: boolean = true;
  private disconnectedSince: number | null = null;
  private listeners: ((event: IModeTransitionEvent) => void)[] = [];

  constructor(initialMode = AppOperatingMode.NORMAL_CLOUD) {
    this.currentMode = initialMode;
    this.isInternetReachable = initialMode === AppOperatingMode.NORMAL_CLOUD;
  }

  /**
   * Updates internet connectivity status
   */
  public updateConnectivity(isOnline: boolean, now = Date.now()): void {
    const wasOnline = this.isInternetReachable;
    this.isInternetReachable = isOnline;

    if (isOnline) {
      this.disconnectedSince = null;
      if (this.currentMode === AppOperatingMode.DISASTER_MESH) {
        this.transitionTo(AppOperatingMode.NORMAL_CLOUD, 'Internet connection restored', now);
      }
    } else {
      if (wasOnline) {
        this.disconnectedSince = now;
      }
      this.checkGracePeriod(now);
    }
  }

  /**
   * Evaluates if 5-second grace period expired while disconnected
   */
  public checkGracePeriod(now = Date.now()): void {
    if (!this.isInternetReachable && this.disconnectedSince !== null) {
      if (now - this.disconnectedSince >= ModeStateMachine.DISCONNECT_GRACE_PERIOD_MS) {
        if (this.currentMode !== AppOperatingMode.DISASTER_MESH) {
          this.transitionTo(AppOperatingMode.DISASTER_MESH, 'Internet lost > 5 seconds, mesh mode engaged', now);
        }
      }
    }
  }

  /**
   * Manually or programmatically transitions state
   */
  public transitionTo(newMode: AppOperatingMode, reason: string, now = Date.now()): void {
    if (this.currentMode === newMode) return;

    const event: IModeTransitionEvent = {
      previousMode: this.currentMode,
      currentMode: newMode,
      reason,
      timestamp: now,
    };

    this.currentMode = newMode;
    this.notifyListeners(event);
  }

  public onTransition(callback: (event: IModeTransitionEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(event: IModeTransitionEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public getOperatingMode(): AppOperatingMode {
    return this.currentMode;
  }

  public isMeshEngaged(): boolean {
    return this.currentMode === AppOperatingMode.DISASTER_MESH || this.currentMode === AppOperatingMode.PHYSICAL_MULE;
  }
}
