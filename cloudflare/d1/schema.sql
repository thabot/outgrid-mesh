-- ==============================================================================
-- Cloudflare D1 Spatial Database Schema
-- Creator & Lead Architect: Thabot <thabo47@gmail.com>
-- Protocol: TOG v1.1 D1 Serverless Edge Storage
-- License: AGPL-3.0 + Commercial Rights Reserved to Thabot
-- ==============================================================================

-- 1. Active nodes currently registered in spatial cells
CREATE TABLE IF NOT EXISTS active_nodes (
    node_id TEXT PRIMARY KEY,
    public_key_hex TEXT NOT NULL,
    h3_res7_index TEXT NOT NULL,
    h3_res9_index TEXT,
    battery_level INTEGER DEFAULT 100,
    role TEXT DEFAULT 'GUEST_VICTIM',
    last_seen INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_nodes_h3_res7 ON active_nodes(h3_res7_index);
CREATE INDEX IF NOT EXISTS idx_active_nodes_last_seen ON active_nodes(last_seen);

-- 2. Known peer neighbor connectivity graph
CREATE TABLE IF NOT EXISTS node_neighbors (
    node_id TEXT NOT NULL,
    neighbor_node_id TEXT NOT NULL,
    rssi INTEGER,
    last_contact INTEGER NOT NULL,
    PRIMARY KEY (node_id, neighbor_node_id)
);

-- 3. FIDO2 / Passkey credentials for verified emergency responders
CREATE TABLE IF NOT EXISTS passkey_credentials (
    credential_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    public_key_spki TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    responder_org TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- 4. E2EE encrypted contact backup synced across devices
CREATE TABLE IF NOT EXISTS user_contacts (
    user_node_id TEXT NOT NULL,
    contact_node_id TEXT NOT NULL,
    encrypted_alias BLOB,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_node_id, contact_node_id)
);

-- Automatic cleanup query (Purges records inactive > 1 hour)
-- DELETE FROM active_nodes WHERE last_seen < (? - 3600);
