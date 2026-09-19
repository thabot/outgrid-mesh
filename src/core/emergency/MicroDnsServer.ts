/**
 * Micro DNS Server & Captive Portal Simulator
 * Intercepts DNS queries on UDP 53 and redirects to local gateway IP
 * Handles Android/iOS captive portal probe URLs (/generate_204, /hotspot-detect.html)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Emergency Bootstrap
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IDnsQuery {
  id: number;
  domain: string;
  type: 'A' | 'AAAA' | 'OTHER';
}

export interface IDnsResponse {
  id: number;
  domain: string;
  ip: string;
  ttl: number;
}

export class MicroDnsServer {
  private localIp: string;
  private isRunning: boolean = false;

  constructor(localIp = '192.168.49.1') {
    this.localIp = localIp;
  }

  public start(): void {
    this.isRunning = true;
  }

  public stop(): void {
    this.isRunning = false;
  }

  public getLocalIp(): string {
    return this.localIp;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Resolves ANY requested domain to the local gateway IP (Captive Portal Trap)
   */
  public resolveQuery(query: IDnsQuery): IDnsResponse {
    if (!this.isRunning) {
      throw new Error('DNS Server is not running');
    }

    return {
      id: query.id,
      domain: query.domain,
      ip: this.localIp,
      ttl: 60, // 60 seconds TTL
    };
  }

  /**
   * Checks if an HTTP path is an OS captive portal probe
   * e.g. Android generate_204, Apple hotspot-detect.html, Windows ncsi.txt
   */
  public isCaptivePortalProbe(path: string): boolean {
    const p = path.toLowerCase();
    return (
      p.includes('generate_204') ||
      p.includes('gen_204') ||
      p.includes('hotspot-detect.html') ||
      p.includes('canonical.html') ||
      p.includes('ncsi.txt') ||
      p.includes('connecttest.txt')
    );
  }

  /**
   * Generates Captive Portal HTTP redirect response to trigger APK install popup
   */
  public handleCaptivePortalProbe(path: string): { statusCode: number; redirectUrl?: string } {
    if (this.isCaptivePortalProbe(path)) {
      return {
        statusCode: 302,
        redirectUrl: `http://${this.localIp}:8080/`,
      };
    }

    return { statusCode: 200 };
  }
}
