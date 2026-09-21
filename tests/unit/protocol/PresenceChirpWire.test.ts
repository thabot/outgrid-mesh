import { describe, expect, it } from 'bun:test';
import {
  RadioCombinationCode,
  RadioCapabilityHelper,
  TOGHeaderFlags,
  type IPresenceChirp,
  TOGPacketType
} from '../../../src/core/protocol/TOGPacket';

describe('Phase 1 - Task 1.1: TOGPacket Wire & Radio Capabilities', () => {
  it('should correctly pack and unpack all 32 RadioCombinationCodes', () => {
    for (let code = 0; code <= 31; code++) {
      const combo = code as RadioCombinationCode;
      const packed = RadioCapabilityHelper.packRadioByte(true, 2, combo);
      const unpacked = RadioCapabilityHelper.unpackRadioByte(packed);

      expect(unpacked.isStationary).toBe(true);
      expect(unpacked.powerTier).toBe(2);
      expect(unpacked.comboCode).toBe(combo);
    }
  });

  it('should handle boundary conditions and clamp invalid values', () => {
    // Power tier clamped to 3 (2 bits)
    const packed = RadioCapabilityHelper.packRadioByte(false, 5, RadioCombinationCode.BT_LEGACY_ONLY);
    const unpacked = RadioCapabilityHelper.unpackRadioByte(packed);
    expect(unpacked.isStationary).toBe(false);
    expect(unpacked.powerTier).toBe(3);
    expect(unpacked.comboCode).toBe(RadioCombinationCode.BT_LEGACY_ONLY);
    expect(unpacked.isLegacyBt).toBe(true);
    expect(unpacked.isRelayCapable).toBe(false);
  });

  it('should classify Relay capability correctly', () => {
    // BT_LEGACY_ONLY cannot be relay
    const legacy = RadioCapabilityHelper.unpackRadioByte(RadioCapabilityHelper.packRadioByte(false, 0, RadioCombinationCode.BT_LEGACY_ONLY));
    expect(legacy.isLegacyBt).toBe(true);
    expect(legacy.isRelayCapable).toBe(false);

    // BT_LEGACY_LORA has LoRa so it IS relay capable
    const legacyLora = RadioCapabilityHelper.unpackRadioByte(RadioCapabilityHelper.packRadioByte(false, 0, RadioCombinationCode.BT_LEGACY_LORA));
    expect(legacyLora.isLegacyBt).toBe(true);
    expect(legacyLora.hasLoRa).toBe(true);
    expect(legacyLora.isRelayCapable).toBe(true);

    // BLE_CODED_ONLY is relay capable
    const coded = RadioCapabilityHelper.unpackRadioByte(RadioCapabilityHelper.packRadioByte(false, 0, RadioCombinationCode.BLE_CODED_ONLY));
    expect(coded.isLegacyBt).toBe(false);
    expect(coded.isRelayCapable).toBe(true);
  });

  it('should provide backward compatibility fallbacks for TOG v1.0 legacy masks', () => {
    // 0x08 was BT_LEGACY_ONLY in TOG v1.0
    const legacy08 = RadioCapabilityHelper.unpackRadioByte(0x08);
    expect(legacy08.comboCode).toBe(RadioCombinationCode.BT_LEGACY_ONLY);
    expect(legacy08.isLegacyBt).toBe(true);

    // 0x0A was BLE_CODED in TOG v1.0
    const coded0A = RadioCapabilityHelper.unpackRadioByte(0x0a);
    expect(coded0A.comboCode).toBe(RadioCombinationCode.BLE_CODED_ONLY);
    expect(coded0A.isLegacyBt).toBe(false);
  });

  it('should verify TOGHeaderFlags definitions', () => {
    expect(TOGHeaderFlags.IS_COMPRESSED).toBe(0x1);
    expect(TOGHeaderFlags.IS_DIRECT_LEAF).toBe(0x2);
    expect(TOGHeaderFlags.RESERVED_CRYPTO).toBe(0x4);
  });
});
