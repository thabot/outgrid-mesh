import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  SQLITE_INIT_MIGRATION_SQL,
  SQLITE_BT_TIER_MIGRATION_SQL,
  type ISchemaPeerRow
} from '../../../src/core/storage/DatabaseSchema';

describe('Phase 6 - Task 6.1: SQLite Database Migration & Peer Storage', () => {
  it('should initialize SQLite tables with radio_code and is_legacy_bt', () => {
    const db = new Database(':memory:');
    db.exec(SQLITE_INIT_MIGRATION_SQL);

    // Insert modern peer
    const insertStmt = db.prepare(`
      INSERT INTO peers (pubkey_hash, last_seen, battery, h3_tile, is_supernode, radio_code, is_legacy_bt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run('hash-modern', Date.now(), 90, 'tile-1', 1, 2, 0); // BLE_CODED_ONLY (2)
    insertStmt.run('hash-legacy', Date.now(), 45, 'tile-2', 0, 1, 1); // BT_LEGACY_ONLY (1)

    const queryStmt = db.prepare('SELECT * FROM peers WHERE pubkey_hash = ?');
    const modernRow = queryStmt.get('hash-modern') as ISchemaPeerRow;
    const legacyRow = queryStmt.get('hash-legacy') as ISchemaPeerRow;

    expect(modernRow.radio_code).toBe(2);
    expect(modernRow.is_legacy_bt).toBe(0);

    expect(legacyRow.radio_code).toBe(1);
    expect(legacyRow.is_legacy_bt).toBe(1);

    db.close();
  });

  it('should support incremental ALTER TABLE migration on existing database', () => {
    const db = new Database(':memory:');

    // Create old schema without radio columns
    db.exec(`
      CREATE TABLE peers (
        pubkey_hash TEXT PRIMARY KEY,
        last_seen INTEGER NOT NULL,
        battery INTEGER NOT NULL DEFAULT 100,
        h3_tile TEXT NOT NULL,
        is_supernode INTEGER NOT NULL DEFAULT 0,
        nickname TEXT,
        safety_numbers TEXT
      );
    `);

    // Insert legacy record before migration
    db.prepare(`
      INSERT INTO peers (pubkey_hash, last_seen, battery, h3_tile, is_supernode)
      VALUES ('old-peer', 12345, 80, 'tile-old', 0)
    `).run();

    // Run migration
    db.exec(SQLITE_BT_TIER_MIGRATION_SQL);

    // Query old peer - new columns should have default 0
    const row = db.prepare('SELECT * FROM peers WHERE pubkey_hash = ?').get('old-peer') as ISchemaPeerRow;
    expect(row.radio_code).toBe(0);
    expect(row.is_legacy_bt).toBe(0);

    // Update with new radio code
    db.prepare('UPDATE peers SET radio_code = 1, is_legacy_bt = 1 WHERE pubkey_hash = ?').run('old-peer');
    const updated = db.prepare('SELECT * FROM peers WHERE pubkey_hash = ?').get('old-peer') as ISchemaPeerRow;
    expect(updated.radio_code).toBe(1);
    expect(updated.is_legacy_bt).toBe(1);

    db.close();
  });
});
