/**
 * Local Embedded HTTP Server for Emergency App Sideloading
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Offline Bootstrap
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IHttpRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
}

export interface IHttpResponse {
  statusCode: number;
  contentType: string;
  contentLength: number;
  body: Uint8Array | string;
  headers?: Record<string, string>;
}

export class LocalHttpServer {
  private port: number;
  private isRunning: boolean = false;
  private apkPayload: Uint8Array | null = null;
  private apkFileName: string = 'outgrid-rescue.apk';

  constructor(port = 8080) {
    this.port = port;
  }

  public setApkPayload(apkBytes: Uint8Array, fileName = 'outgrid-rescue.apk'): void {
    this.apkPayload = apkBytes;
    this.apkFileName = fileName;
  }

  public start(): void {
    this.isRunning = true;
  }

  public stop(): void {
    this.isRunning = false;
  }

  public getPort(): number {
    return this.port;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Dispatches incoming HTTP requests to sideload handlers
   */
  public handleRequest(req: IHttpRequest): IHttpResponse {
    if (!this.isRunning) {
      return {
        statusCode: 503,
        contentType: 'text/plain; charset=utf-8',
        contentLength: 19,
        body: 'Service Unavailable',
      };
    }

    const cleanUrl = req.url.split('?')[0];

    // 1. Root landing page for disaster victims connecting to Wi-Fi
    if (cleanUrl === '/' || cleanUrl === '/index.html') {
      const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OutGrid Rescue Emergency Sideload</title>
</head>
<body style="font-family:sans-serif;text-align:center;padding:24px;">
  <h2>🚨 OutGrid Rescue ออฟไลน์ฉุกเฉิน</h2>
  <p>ดาวน์โหลดแอปสื่อสารกู้ภัยโดยไม่ต้องใช้อินเทอร์เน็ต</p>
  <a href="/download/apk" style="display:inline-block;background:#059669;color:#fff;padding:16px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:18px;">
    📥 ดาวน์โหลดแอป (.apk)
  </a>
</body>
</html>`;
      const encoded = new TextEncoder().encode(html);
      return {
        statusCode: 200,
        contentType: 'text/html; charset=utf-8',
        contentLength: encoded.length,
        body: html,
      };
    }

    // 2. APK Download Endpoint
    if (cleanUrl === '/download/apk' || cleanUrl === `/${this.apkFileName}`) {
      if (!this.apkPayload) {
        return {
          statusCode: 404,
          contentType: 'text/plain; charset=utf-8',
          contentLength: 13,
          body: 'APK Not Found',
        };
      }

      return {
        statusCode: 200,
        contentType: 'application/vnd.android.package-archive',
        contentLength: this.apkPayload.length,
        body: this.apkPayload,
        headers: {
          'Content-Disposition': `attachment; filename="${this.apkFileName}"`,
        },
      };
    }

    return {
      statusCode: 404,
      contentType: 'text/plain; charset=utf-8',
      contentLength: 9,
      body: 'Not Found',
    };
  }
}
