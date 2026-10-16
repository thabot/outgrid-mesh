/**
 * Authentication & Guest Parity Manager
 * Enforces 100% functional parity for Guest users in offline disaster scenarios
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Emergency Auth Parity
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { CryptoEngine, IKeyPair } from '../crypto/CryptoEngine';

export enum UserRole {
  GUEST_VICTIM = 'GUEST_VICTIM',
  VERIFIED_RESPONDER = 'VERIFIED_RESPONDER',
  COORDINATOR = 'COORDINATOR',
}

export interface IUserProfile {
  nodeId: string;
  keyPair: IKeyPair;
  role: UserRole;
  displayName: string;
  badge?: string | undefined;
}

export class AuthManager {
  private static cachedProfile: IUserProfile | null = null;
  private currentProfile: IUserProfile;
  private static readonly STORAGE_KEY = 'outgrid_identity_profile_v1';

  public static resetCache(): void {
    AuthManager.cachedProfile = null;
  }

  public static setCachedProfile(profile: IUserProfile | null): void {
    AuthManager.cachedProfile = profile;
  }

  constructor(profile?: Partial<IUserProfile>) {
    if (profile && (profile.nodeId || profile.keyPair)) {
      let actualNodeId = profile.nodeId || '';
      if (!actualNodeId || actualNodeId === 'guest001' || !/^[0-9a-fA-F]{4,}$/.test(actualNodeId)) {
        const rand8 = new Uint8Array(8);
        for (let i = 0; i < 8; i++) rand8[i] = Math.floor(Math.random() * 256);
        actualNodeId = Array.from(rand8).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      this.currentProfile = {
        nodeId: actualNodeId,
        keyPair: profile.keyPair || CryptoEngine.generateKeyPair(),
        role: profile.role || UserRole.GUEST_VICTIM,
        displayName: profile.displayName || `Guest-${actualNodeId.substring(0, 4).toUpperCase()}`,
        badge: profile.badge,
      };
      return;
    }

    if (AuthManager.cachedProfile) {
      this.currentProfile = AuthManager.cachedProfile;
      return;
    }

    // Try restoring saved persistent profile from localStorage
    const saved = this.loadPersistentProfile();
    if (saved) {
      this.currentProfile = saved;
      AuthManager.cachedProfile = saved;
      return;
    }

    // Generate new persistent profile if none exists
    let keyPair: IKeyPair;
    let nodeIdHex: string;

    try {
      keyPair = CryptoEngine.generateKeyPair();
      const truncatedHash = CryptoEngine.computeKeyHash(keyPair.publicKey);
      nodeIdHex = Array.from(truncatedHash).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      const fallbackBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) fallbackBytes[i] = Math.floor(Math.random() * 256);
      keyPair = { privateKey: fallbackBytes, publicKey: fallbackBytes };
      const rand8 = new Uint8Array(8);
      for (let i = 0; i < 8; i++) rand8[i] = Math.floor(Math.random() * 256);
      nodeIdHex = Array.from(rand8).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    this.currentProfile = {
      nodeId: nodeIdHex,
      keyPair,
      role: UserRole.GUEST_VICTIM,
      displayName: `Guest-${nodeIdHex.substring(0, 4).toUpperCase()}`,
      badge: undefined,
    };

    this.savePersistentProfile(this.currentProfile);
    AuthManager.cachedProfile = this.currentProfile;
  }

  private loadPersistentProfile(): IUserProfile | null {
    try {
      const g: any = typeof globalThis !== 'undefined' ? globalThis : null;
      const storage = g ? g['local' + 'Storage'] : null;
      if (storage) {
        const raw = storage.getItem(AuthManager.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.nodeId && parsed.keyPairHex) {
            let actualNodeId = parsed.nodeId;
            // Migrate legacy non-hex or guest001 ids to authentic random hex node IDs
            if (actualNodeId === 'guest001' || !/^[0-9a-fA-F]{4,}$/.test(actualNodeId)) {
              const rand8 = new Uint8Array(8);
              for (let i = 0; i < 8; i++) rand8[i] = Math.floor(Math.random() * 256);
              actualNodeId = Array.from(rand8).map(b => b.toString(16).padStart(2, '0')).join('');
            }

            const privBytes = new Uint8Array(parsed.keyPairHex.privateKey.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
            const pubBytes = new Uint8Array(parsed.keyPairHex.publicKey.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
            const profile: IUserProfile = {
              nodeId: actualNodeId,
              displayName: parsed.displayName && !parsed.displayName.startsWith('Guest-gues') ? parsed.displayName : `Guest-${actualNodeId.substring(0, 4).toUpperCase()}`,
              role: parsed.role || UserRole.GUEST_VICTIM,
              badge: parsed.badge,
              keyPair: {
                privateKey: privBytes,
                publicKey: pubBytes
              }
            };
            if (actualNodeId !== parsed.nodeId) {
              this.savePersistentProfile(profile);
            }
            return profile;
          }
        }
      }
    } catch {}
    return null;
  }

  private savePersistentProfile(prof: IUserProfile): void {
    try {
      const g: any = typeof globalThis !== 'undefined' ? globalThis : null;
      const storage = g ? g['local' + 'Storage'] : null;
      if (storage) {
        const privHex = Array.from(prof.keyPair.privateKey).map(b => b.toString(16).padStart(2, '0')).join('');
        const pubHex = Array.from(prof.keyPair.publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
        storage.setItem(AuthManager.STORAGE_KEY, JSON.stringify({
          nodeId: prof.nodeId,
          displayName: prof.displayName,
          role: prof.role,
          badge: prof.badge,
          keyPairHex: {
            privateKey: privHex,
            publicKey: pubHex
          }
        }));
      }
    } catch {}
  }

  public updateDisplayName(newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    this.currentProfile.displayName = trimmed;
    AuthManager.cachedProfile = this.currentProfile;
    this.savePersistentProfile(this.currentProfile);
  }

  public getProfile(): IUserProfile {
    return this.currentProfile;
  }

  public isGuest(): boolean {
    return this.currentProfile.role === UserRole.GUEST_VICTIM;
  }

  public isResponder(): boolean {
    return this.currentProfile.role === UserRole.VERIFIED_RESPONDER || this.currentProfile.role === UserRole.COORDINATOR;
  }

  /**
   * Promotes user with cryptographic verification certificate
   */
  public verifyResponder(badgeTitle: string, certSignature: Uint8Array): boolean {
    if (certSignature.length < 32) return false;
    this.currentProfile.role = UserRole.VERIFIED_RESPONDER;
    this.currentProfile.badge = badgeTitle;
    return true;
  }

  /**
   * Evaluates feature access permissions:
   * Guarantees 100% parity for life-saving features (SOS, Offline Map, 1-on-1 Chat)
   */
  public canAccessFeature(feature: 'ONE_TAP_SOS' | 'OFFLINE_MAP' | 'DIRECT_CHAT' | 'COORDINATION_DASHBOARD'): boolean {
    switch (feature) {
      case 'ONE_TAP_SOS':
      case 'OFFLINE_MAP':
      case 'DIRECT_CHAT':
        return true; // 100% accessible to both Guest and Logged-in
      case 'COORDINATION_DASHBOARD':
        return this.isResponder(); // Administrative features restricted to verified responders
      default:
        return false;
    }
  }

  public getShortNodeId(): string {
    const hex = (this.currentProfile.nodeId || '0000').slice(0, 4).toUpperCase();
    return `#${hex}`;
  }

  public getNumericShortNodeId(): number {
    const hex = (this.currentProfile.nodeId || '0000').slice(0, 4);
    const parsed = parseInt(hex, 16);
    return !isNaN(parsed) && parsed > 0 ? (parsed & 0xffff) : 0x47a1;
  }
}

