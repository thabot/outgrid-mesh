/**
 * SQLite Database Schema Definitions & Queries
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 4 Task 4.1
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface ISchemaMessageRow {
  id: string;
  type: number;
  sender: string;
  recipient: string;
  payload: Uint8Array;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  timestamp: number;
  ttl: number;
  hops: number;
  is_emergency: number;
}

export interface ISchemaPeerRow {
  pubkey_hash: string;
  last_seen: number;
  battery: number;
  h3_tile: string;
  is_supernode: number;
  nickname: string | null;
  safety_numbers: string | null;
}

export interface ISchemaDtnBundleRow {
  id: string;
  bundle_data: Uint8Array;
  priority: number;
  expires_at: number;
  hop_count: number;
}

export interface ISchemaVectorTileRow {
  tile_id: string;
  zoom: number;
  pbf_data: Uint8Array;
  last_accessed: number;
}

export const SQLITE_INIT_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    type INTEGER NOT NULL,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    payload BLOB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    timestamp INTEGER NOT NULL,
    ttl INTEGER NOT NULL,
    hops INTEGER NOT NULL,
    is_emergency INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient);

CREATE TABLE IF NOT EXISTS peers (
    pubkey_hash TEXT PRIMARY KEY,
    last_seen INTEGER NOT NULL,
    battery INTEGER NOT NULL DEFAULT 100,
    h3_tile TEXT NOT NULL,
    is_supernode INTEGER NOT NULL DEFAULT 0,
    nickname TEXT,
    safety_numbers TEXT
);

CREATE INDEX IF NOT EXISTS idx_peers_last_seen ON peers(last_seen);
CREATE INDEX IF NOT EXISTS idx_peers_h3 ON peers(h3_tile);

CREATE TABLE IF NOT EXISTS dtn_bundles (
    id TEXT PRIMARY KEY,
    bundle_data BLOB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    expires_at INTEGER NOT NULL,
    hop_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_dtn_expires ON dtn_bundles(expires_at);

CREATE TABLE IF NOT EXISTS vector_tiles (
    tile_id TEXT PRIMARY KEY,
    zoom INTEGER NOT NULL,
    pbf_data BLOB NOT NULL,
    last_accessed INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tiles_zoom ON vector_tiles(zoom);
`;
