/**
 * Vector Basemap Parser & World Landmass Engine (<5MB)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Offline Map
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IMapFeature {
  id: number;
  type: 'land' | 'coastline' | 'boundary' | 'city';
  coordinates: number[][]; // [lng, lat] pairs
  name?: string;
}

export interface IVectorBasemapHeader {
  magic: string;      // 'OGMB' (OutGrid Map Binary)
  version: number;    // 1
  featureCount: number;
  extent: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export class VectorTileParser {
  public static readonly MAGIC = 'OGMB';

  /**
   * Serializes raw map features into a compact binary vector basemap file (<5MB)
   */
  public static serializeBasemap(features: IMapFeature[]): Uint8Array {
    const headerBytes = 24;
    let dataSize = 0;

    // Calculate needed byte size
    for (const f of features) {
      dataSize += 8; // id(4B) + type(1B) + coordCount(2B) + reserved(1B)
      dataSize += f.coordinates.length * 4; // delta lng(2B) + delta lat(2B)
    }

    const buffer = new Uint8Array(headerBytes + dataSize);
    const view = new DataView(buffer.buffer);

    // Header: Magic 'OGMB' (4B)
    buffer.set(new TextEncoder().encode(this.MAGIC), 0);
    view.setUint16(4, 1, false); // Version 1
    view.setUint32(6, features.length, false);

    // Global Extent: [-180, -90, 180, 90]
    view.setInt16(10, -180, false);
    view.setInt16(12, -90, false);
    view.setInt16(14, 180, false);
    view.setInt16(16, 90, false);

    let offset = headerBytes;
    for (const f of features) {
      view.setUint32(offset, f.id, false);
      const typeCode = f.type === 'land' ? 1 : f.type === 'coastline' ? 2 : f.type === 'boundary' ? 3 : 4;
      view.setUint8(offset + 4, typeCode);
      view.setUint16(offset + 5, f.coordinates.length, false);
      view.setUint8(offset + 7, 0); // reserved
      offset += 8;

      for (const pt of f.coordinates) {
        // Scaled to 100x int16 for tight compression (-180.00 to 180.00)
        view.setInt16(offset, Math.round(pt[0] * 100), false);
        view.setInt16(offset + 2, Math.round(pt[1] * 100), false);
        offset += 4;
      }
    }

    return buffer;
  }

  /**
   * Parses compact binary vector basemap
   */
  public static parseBasemap(buffer: Uint8Array): { header: IVectorBasemapHeader; features: IMapFeature[] } {
    if (buffer.length < 24) {
      throw new Error('Vector basemap buffer too short');
    }

    const magic = new TextDecoder().decode(buffer.subarray(0, 4));
    if (magic !== this.MAGIC) {
      throw new Error(`Invalid map magic: ${magic}`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const version = view.getUint16(4, false);
    const featureCount = view.getUint32(6, false);

    const minLng = view.getInt16(10, false);
    const minLat = view.getInt16(12, false);
    const maxLng = view.getInt16(14, false);
    const maxLat = view.getInt16(16, false);

    const features: IMapFeature[] = [];
    let offset = 24;

    for (let i = 0; i < featureCount; i++) {
      if (offset >= buffer.length) break;

      const id = view.getUint32(offset, false);
      const typeCode = view.getUint8(offset + 4);
      const coordCount = view.getUint16(offset + 5, false);
      offset += 8;

      const type = typeCode === 1 ? 'land' : typeCode === 2 ? 'coastline' : typeCode === 3 ? 'boundary' : 'city';
      const coordinates: number[][] = [];

      for (let j = 0; j < coordCount; j++) {
        const lng = view.getInt16(offset, false) / 100.0;
        const lat = view.getInt16(offset + 2, false) / 100.0;
        coordinates.push([lng, lat]);
        offset += 4;
      }

      features.push({ id, type, coordinates });
    }

    return {
      header: {
        magic,
        version,
        featureCount,
        extent: [minLng, minLat, maxLng, maxLat]
      },
      features
    };
  }

  /**
   * Validates and parses GeoJSON World Basemap Level 2
   */
  public static parseWorldBasemapGeoJson(geoJsonData: any): {
    valid: boolean;
    featureCount: number;
    layers: Record<string, number>;
  } {
    if (!geoJsonData || geoJsonData.type !== 'FeatureCollection' || !Array.isArray(geoJsonData.features)) {
      throw new Error('Invalid GeoJSON: must be a FeatureCollection with features array');
    }

    const layers: Record<string, number> = {
      country: 0,
      state: 0,
      river: 0,
      city: 0,
      other: 0,
    };

    for (const f of geoJsonData.features) {
      const layerType = f?.properties?.layer ?? 'other';
      if (layers[layerType] !== undefined) {
        layers[layerType]++;
      } else {
        layers.other++;
      }
    }

    return {
      valid: true,
      featureCount: geoJsonData.features.length,
      layers,
    };
  }
}
