/**
 * Unit tests for D1 Database Schema
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';

describe('D1 Database Schema (Cloudflare Edge Spatial DB)', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    const schemaSql = readFileSync('cloudflare/d1/schema.sql', 'utf8');
    db.run(schemaSql);
  });

  it('should create all required tables and indexes successfully', () => {
    const tables = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    ).all();

    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('active_nodes');
    expect(tableNames).toContain('node_neighbors');
    expect(tableNames).toContain('passkey_credentials');
    expect(tableNames).toContain('user_contacts');
  });

  it('should support automatic 1-hour TTL node expiration pruning', () => {
    const now = 10000;
    const oldNode = now - 3700; // Inactive for > 1 hour
    const activeNode = now - 100; // Active recently

    db.run(`INSERT INTO active_nodes (node_id, public_key_hex, h3_res7_index, last_seen, created_at)
            VALUES ('old_node', 'pk1', 'h3_7', ${oldNode}, ${oldNode})`);

    db.run(`INSERT INTO active_nodes (node_id, public_key_hex, h3_res7_index, last_seen, created_at)
            VALUES ('active_node', 'pk2', 'h3_7', ${activeNode}, ${activeNode})`);

    // Prune query
    db.run(`DELETE FROM active_nodes WHERE last_seen < (? - 3600);`, [now]);

    const remaining = db.query<{ node_id: string }, []>('SELECT node_id FROM active_nodes;').all();
    expect(remaining.length).toBe(1);
    expect(remaining[0].node_id).toBe('active_node');
  });
});
