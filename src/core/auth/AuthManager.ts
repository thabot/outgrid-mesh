/**
 * Hybrid Authentication & Identity Manager
 * OutGrid Mesh - Zero-Barrier Offline Guest + Google OAuth2 Sync
 * Author: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IUserIdentity {
  pubkeyHex: string;
  isGuest: boolean;
  email?: string;
  displayName?: string;
  emergencyContacts: string[];
}

export class AuthManager {
  private currentIdentity: IUserIdentity;

  constructor() {
    // Default: Immediate Life-Saving Zero-Barrier Guest Mode (Offline Ready)
    this.currentIdentity = {
      pubkeyHex: '0000000000000000',
      isGuest: true,
      emergencyContacts: []
    };
  }

  getIdentity(): IUserIdentity {
    return this.currentIdentity;
  }

  /**
   * Connect and link Google / Gmail account when Internet is available
   */
  async linkGoogleAccount(idToken: string, email: string, name: string): Promise<boolean> {
    this.currentIdentity = {
      ...this.currentIdentity,
      isGuest: false,
      email,
      displayName: name
    };
    return true;
  }

  addEmergencyContact(contact: string): void {
    if (!this.currentIdentity.emergencyContacts.includes(contact)) {
      this.currentIdentity.emergencyContacts.push(contact);
    }
  }
}
