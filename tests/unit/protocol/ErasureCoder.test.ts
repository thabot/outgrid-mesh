import { describe, it, expect } from 'bun:test';
import { ErasureCoder } from '@core/protocol/ErasureCoder';

describe('ErasureCoder (Phase 2 Task 2.6.4)', () => {
  it('should encode payload into exactly 8 data shards + 4 parity shards (12 total)', () => {
    const rawData = new TextEncoder().encode('Emergency SOS Beacon: Flood in district 4, 12 trapped on roof.');
    const shards = ErasureCoder.encode(rawData);

    expect(shards).toHaveLength(12);
    expect(shards.filter(s => !s.isParity)).toHaveLength(8);
    expect(shards.filter(s => s.isParity)).toHaveLength(4);
  });

  it('should reconstruct original data with zero lost shards', () => {
    const original = new TextEncoder().encode('Full pristine payload without packet drops in transmission.');
    const shards = ErasureCoder.encode(original);

    const decoded = ErasureCoder.decode(shards, original.length);
    expect(decoded).not.toBeNull();
    expect(new TextDecoder().decode(decoded!)).toBe('Full pristine payload without packet drops in transmission.');
  });

  it('should mathematically recover 100% when 1 shard is lost in air', () => {
    const original = new TextEncoder().encode('Critical Medical Supplies Needed: Oxygen tank, Saline IV.');
    const shards = ErasureCoder.encode(original);

    // Drop shard 2
    const surviving = shards.filter(s => s.index !== 2);
    expect(surviving).toHaveLength(11);

    const decoded = ErasureCoder.decode(surviving, original.length);
    expect(decoded).not.toBeNull();
    expect(new TextDecoder().decode(decoded!)).toBe('Critical Medical Supplies Needed: Oxygen tank, Saline IV.');
  });

  it('should mathematically recover 100% when 2 shards are lost in air', () => {
    const original = new TextEncoder().encode('Bridge collapsed at kilometer 45 on highway 108.');
    const shards = ErasureCoder.encode(original);

    // Drop shards 0 and 5
    const surviving = shards.filter(s => s.index !== 0 && s.index !== 5);
    expect(surviving).toHaveLength(10);

    const decoded = ErasureCoder.decode(surviving, original.length);
    expect(decoded).not.toBeNull();
    expect(new TextDecoder().decode(decoded!)).toBe('Bridge collapsed at kilometer 45 on highway 108.');
  });

  it('should mathematically recover 100% when 3 shards are lost in air', () => {
    const original = new TextEncoder().encode('Helicopter landing zone secured at school playground.');
    const shards = ErasureCoder.encode(original);

    // Drop shards 1, 4, 7
    const surviving = shards.filter(s => s.index !== 1 && s.index !== 4 && s.index !== 7);
    expect(surviving).toHaveLength(9);

    const decoded = ErasureCoder.decode(surviving, original.length);
    expect(decoded).not.toBeNull();
    expect(new TextDecoder().decode(decoded!)).toBe('Helicopter landing zone secured at school playground.');
  });

  it('should mathematically recover 100% when 4 shards (maximum 33.3% loss) are dropped', () => {
    const original = new TextEncoder().encode('Maximum 4-shard packet loss stress test under severe RF interference.');
    const shards = ErasureCoder.encode(original);

    // Drop 4 data shards (0, 1, 2, 3), rely entirely on remaining 4 data + 4 parity
    const surviving = shards.filter(s => s.index > 3);
    expect(surviving).toHaveLength(8);

    const decoded = ErasureCoder.decode(surviving, original.length);
    expect(decoded).not.toBeNull();
    expect(new TextDecoder().decode(decoded!)).toBe('Maximum 4-shard packet loss stress test under severe RF interference.');
  });

  it('should return null when 5 shards are dropped (exceeding FEC threshold)', () => {
    const original = new TextEncoder().encode('Test threshold boundary when packet drop exceeds capacity.');
    const shards = ErasureCoder.encode(original);

    // Drop 5 shards (only 7 surviving)
    const surviving = shards.slice(0, 7);
    expect(surviving).toHaveLength(7);

    const decoded = ErasureCoder.decode(surviving, original.length);
    expect(decoded).toBeNull();
  });
});
