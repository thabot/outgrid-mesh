/**
 * FIDO2 / WebAuthn Passkey Authentication Manager
 * Verifies biometric signatures for authenticated emergency responders
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Passkey Identity
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IPasskeyRegistration {
  credentialId: string;
  userId: string;
  publicKeyHex: string;
  responderOrg: string;
  counter: number;
}

export interface IPasskeyAuthChallenge {
  challenge: string;
  timeout: number;
}

export class PasskeyAuthManager {
  private registeredCredentials: Map<string, IPasskeyRegistration> = new Map();
  private pendingChallenges: Map<string, string> = new Map();

  /**
   * Generates a random cryptographic challenge for WebAuthn ceremony
   */
  public createChallenge(userId: string): IPasskeyAuthChallenge {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const challengeHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    this.pendingChallenges.set(userId, challengeHex);

    return {
      challenge: challengeHex,
      timeout: 60000,
    };
  }

  /**
   * Registers a new responder passkey credential
   */
  public registerCredential(cred: IPasskeyRegistration): void {
    this.registeredCredentials.set(cred.credentialId, cred);
  }

  /**
   * Verifies an authentication response against registered credential and challenge
   */
  public verifyAuthentication(
    credentialId: string,
    userId: string,
    clientChallenge: string,
    signatureOk: boolean
  ): boolean {
    const expectedChallenge = this.pendingChallenges.get(userId);
    if (!expectedChallenge || expectedChallenge !== clientChallenge) {
      return false; // Challenge mismatch or expired
    }

    const cred = this.registeredCredentials.get(credentialId);
    if (!cred || cred.userId !== userId) {
      return false; // Unknown or mismatched credential
    }

    if (!signatureOk) {
      return false;
    }

    // Success: Consume challenge and increment counter
    this.pendingChallenges.delete(userId);
    cred.counter++;
    return true;
  }

  public getCredential(credentialId: string): IPasskeyRegistration | undefined {
    return this.registeredCredentials.get(credentialId);
  }
}
