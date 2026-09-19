/**
 * Tile Proxy Client & ODbL Attribution Manager
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { OfflineSpatialCache } from './OfflineSpatialCache';

export const ODBL_ATTRIBUTION = '© OpenStreetMap contributors, ODbL 1.0 (OutGrid Mesh Humanitarian Cache)';

export class TileProxyClient {
  private edgeBaseUrl: string;
  private localCache: OfflineSpatialCache;

  constructor(edgeBaseUrl: string, localCache: OfflineSpatialCache) {
    this.edgeBaseUrl = edgeBaseUrl.replace(/\/+$/, '');
    this.localCache = localCache;
  }

  /**
   * Fetches tile bytes with edge caching and local fallback
   */
  public async getTile(z: number, x: number, y: number): Promise<{ data: Uint8Array; fromCache: boolean }> {
    const tileKey = `tile_${z}_${x}_${y}`;

    // 1. Check local offline cache first
    const cached = this.localCache.get(tileKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }

    // 2. Fetch from Cloudflare Edge CDN when connected
    const url = `${this.edgeBaseUrl}/tiles/${z}/${x}/${y}.pbf`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch map tile: HTTP ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const data = new Uint8Array(arrayBuf);

    // Save to local offline cache for future use
    this.localCache.put(tileKey, data);
    return { data, fromCache: false };
  }

  public getAttribution(): string {
    return ODBL_ATTRIBUTION;
  }
}
