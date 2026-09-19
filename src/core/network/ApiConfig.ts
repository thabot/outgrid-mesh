/**
 * OutGrid Mesh - Dynamic API Configuration & Zero-Cost Cloudflare Domain Architecture
 * Protocol: Thabot OutGrid Protocol (TOG v1.1)
 * Author: Thabot (thabo47@gmail.com)
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface CloudEndpointConfig {
  workerUrl: string;
  pagesUrl: string;
  isCustom: boolean;
  timeoutMs: number;
  retryAttempts: number;
}

export interface ApiStatus {
  online: boolean;
  endpoint: string;
  latencyMs: number | null;
  lastChecked: number | null;
}

export class ApiConfig {
  public static readonly DEFAULT_WORKER_URL = 'https://api.outgrid-mesh.workers.dev';
  public static readonly DEFAULT_PAGES_URL = 'https://outgrid-rescue.pages.dev';
  public static readonly DEFAULT_TIMEOUT_MS = 5000;
  public static readonly DEFAULT_RETRY_ATTEMPTS = 3;

  private currentConfig: CloudEndpointConfig;
  private currentStatus: ApiStatus;

  constructor(customConfig?: Partial<CloudEndpointConfig>) {
    this.currentConfig = {
      workerUrl: customConfig?.workerUrl ?? ApiConfig.DEFAULT_WORKER_URL,
      pagesUrl: customConfig?.pagesUrl ?? ApiConfig.DEFAULT_PAGES_URL,
      isCustom: customConfig?.isCustom ?? false,
      timeoutMs: customConfig?.timeoutMs ?? ApiConfig.DEFAULT_TIMEOUT_MS,
      retryAttempts: customConfig?.retryAttempts ?? ApiConfig.DEFAULT_RETRY_ATTEMPTS,
    };

    this.currentStatus = {
      online: false,
      endpoint: this.currentConfig.workerUrl,
      latencyMs: null,
      lastChecked: null,
    };
  }

  public getConfig(): CloudEndpointConfig {
    return { ...this.currentConfig };
  }

  public getStatus(): ApiStatus {
    return { ...this.currentStatus };
  }

  public setCustomEndpoint(customWorkerUrl: string, customPagesUrl?: string): boolean {
    if (!this.isValidUrl(customWorkerUrl)) {
      return false;
    }

    const pages = customPagesUrl && this.isValidUrl(customPagesUrl)
      ? customPagesUrl
      : this.currentConfig.pagesUrl;

    this.currentConfig = {
      ...this.currentConfig,
      workerUrl: customWorkerUrl.trim().replace(/\/+$/, ''),
      pagesUrl: pages.trim().replace(/\/+$/, ''),
      isCustom: true,
    };

    this.currentStatus.endpoint = this.currentConfig.workerUrl;
    return true;
  }

  public resetToDefault(): void {
    this.currentConfig = {
      workerUrl: ApiConfig.DEFAULT_WORKER_URL,
      pagesUrl: ApiConfig.DEFAULT_PAGES_URL,
      isCustom: false,
      timeoutMs: ApiConfig.DEFAULT_TIMEOUT_MS,
      retryAttempts: ApiConfig.DEFAULT_RETRY_ATTEMPTS,
    };
    this.currentStatus.endpoint = this.currentConfig.workerUrl;
  }

  public updateHealth(isOnline: boolean, latencyMs: number | null = null): void {
    this.currentStatus = {
      online: isOnline,
      endpoint: this.currentConfig.workerUrl,
      latencyMs,
      lastChecked: Date.now(),
    };
  }

  public resolveSignalingUrl(path: string = '/signal'): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.currentConfig.workerUrl}${cleanPath}`;
  }

  public resolveSpatialD1Url(h3Index: string): string {
    return `${this.currentConfig.workerUrl}/spatial/${h3Index}`;
  }

  public exportJson(): string {
    return JSON.stringify(this.currentConfig);
  }

  public importJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<CloudEndpointConfig>;
      if (parsed.workerUrl && this.isValidUrl(parsed.workerUrl)) {
        this.currentConfig = {
          workerUrl: parsed.workerUrl,
          pagesUrl: parsed.pagesUrl && this.isValidUrl(parsed.pagesUrl) ? parsed.pagesUrl : ApiConfig.DEFAULT_PAGES_URL,
          isCustom: parsed.isCustom ?? true,
          timeoutMs: parsed.timeoutMs ?? ApiConfig.DEFAULT_TIMEOUT_MS,
          retryAttempts: parsed.retryAttempts ?? ApiConfig.DEFAULT_RETRY_ATTEMPTS,
        };
        this.currentStatus.endpoint = this.currentConfig.workerUrl;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public isValidUrl(testUrl: string): boolean {
    if (!testUrl || typeof testUrl !== 'string') return false;
    try {
      const urlPattern = /^(https?:\/\/)([a-zA-Z0-9.-]+)(:[0-9]+)?(\/.*)?$/;
      return urlPattern.test(testUrl.trim());
    } catch {
      return false;
    }
  }
}
