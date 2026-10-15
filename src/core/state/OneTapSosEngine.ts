/**
 * One-Tap SOS Dispatch Engine
 * Constructs and broadcasts compact, prioritized SOS beacon in a single tap
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 One-Tap SOS Beacon
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { ITOGPacket, TOGPacketType, TOGPriority, DEFAULT_SOS_HOPS, CannedEmergencyCode } from '../protocol/TOGPacket';
import { H3DeltaCompressor } from '../spatial/H3DeltaCompressor';
import { PacketSerializer } from '../protocol/PacketSerializer';

export enum SosStatusCategory {
  TRAPPED_RUBBLE = 'TRAPPED_RUBBLE',     // ติดอยู่ใต้ซากปรักหักพัง
  VULNERABLE_CHILD_ELDERLY = 'VULNERABLE', // มีเด็ก/คนชรา/ผู้ป่วยติดเตียง
  NEED_BOAT = 'NEED_BOAT',               // น้ำท่วมสูง ต้องการเรือด่วน
  OXYGEN_DEPLETION = 'OXYGEN_DEPLETION', // ขาดออกซิเจน/หมดสติ
  GENERAL_EMERGENCY = 'GENERAL',         // เหตุฉุกเฉินทั่วไป
}

export interface ISosRequest {
  lat: number;
  lng: number;
  batteryLevel: number;
  category: SosStatusCategory;
  senderPubkeyHash: Uint8Array;
}

export class OneTapSosEngine {
  /**
   * Constructs compact SOS emergency beacon packet
   */
  public static createSosBeacon(req: ISosRequest, messageId = BigInt(Date.now())): ITOGPacket {
    // 1. Compress GPS location into H3 Index + 4B Delta (<1m precision)
    const compressed = H3DeltaCompressor.compress(req.lat, req.lng);

    // 2. Compact payload: [4B DeltaX/Y] [1B Battery %] [1B Category Enum]
    const payload = new Uint8Array(6);
    const view = new DataView(payload.buffer);
    view.setInt16(0, compressed.deltaOffset.deltaX, false);
    view.setInt16(2, compressed.deltaOffset.deltaY, false);
    payload[4] = Math.max(0, Math.min(100, req.batteryLevel));
    payload[5] = OneTapSosEngine.encodeCategory(req.category);

    return {
      header: {
        magic: 0x544F,
        version: 1,
        packetType: TOGPacketType.SOS_BEACON,
        ttlHops: DEFAULT_SOS_HOPS, // Maximum hops for life-critical SOS (25 hops for flood penetration)
        priority: TOGPriority.CRITICAL_SOS,
        flags: 0,
        reserved: 0,
      },
      messageId,
      senderPubkeyHash: req.senderPubkeyHash,
      recipientHash: new Uint8Array(8), // Broadcast (all zeros)
      targetH3Index: compressed.h3Index,
      payloadLength: payload.length,
      payload,
    };
  }

  public static encodeCategory(cat: SosStatusCategory): number {
    switch (cat) {
      case SosStatusCategory.TRAPPED_RUBBLE: return 0x01;
      case SosStatusCategory.VULNERABLE_CHILD_ELDERLY: return 0x02;
      case SosStatusCategory.NEED_BOAT: return 0x03;
      case SosStatusCategory.OXYGEN_DEPLETION: return 0x04;
      default: return 0x00;
    }
  }

  public static decodeCategory(code: number): SosStatusCategory {
    switch (code) {
      case 0x01: return SosStatusCategory.TRAPPED_RUBBLE;
      case 0x02: return SosStatusCategory.VULNERABLE_CHILD_ELDERLY;
      case 0x03: return SosStatusCategory.NEED_BOAT;
      case 0x04: return SosStatusCategory.OXYGEN_DEPLETION;
      default: return SosStatusCategory.GENERAL_EMERGENCY;
    }
  }

  /**
   * Constructs compact 21-byte SOS emergency beacon packet strictly fitting BLE Legacy limit
   */
  public static createCompactSosBeacon(req: ISosRequest, seqId: number = (Date.now() & 0xff)): Uint8Array {
    const compressed = H3DeltaCompressor.compress(req.lat, req.lng);
    const catCode = OneTapSosEngine.encodeCategory(req.category);
    return PacketSerializer.serializeCompactSosBeacon(
      seqId,
      compressed.h3Index,
      compressed.deltaOffset.deltaX,
      compressed.deltaOffset.deltaY,
      req.batteryLevel,
      catCode
    );
  }

  /**
   * Constructs fixed 10-byte Canned Emergency Beacon containing sender Short ID
   */
  public static createCannedEmergencyBeacon(
    senderShortId: number,
    category: SosStatusCategory,
    batteryLevel: number,
    sequenceId: number = (Date.now() & 0xffff)
  ): Uint8Array {
    let cannedCode = CannedEmergencyCode.NEED_MEDIC;
    switch (category) {
      case SosStatusCategory.NEED_BOAT:
        cannedCode = CannedEmergencyCode.FLOOD_DANGER;
        break;
      case SosStatusCategory.TRAPPED_RUBBLE:
        cannedCode = CannedEmergencyCode.TRAPPED;
        break;
      case SosStatusCategory.OXYGEN_DEPLETION:
        cannedCode = CannedEmergencyCode.FIRE_HAZARD;
        break;
      case SosStatusCategory.VULNERABLE_CHILD_ELDERLY:
      case SosStatusCategory.GENERAL_EMERGENCY:
      default:
        cannedCode = CannedEmergencyCode.NEED_MEDIC;
        break;
    }

    return PacketSerializer.serializeCannedEmergency({
      packetType: TOGPacketType.SOS_BEACON,
      hopCount: 7,
      senderShortId,
      recipientShortId: 0xffff,
      sequenceId,
      statusCode: cannedCode,
      h3LowerRes9: 0,
      batteryLevelTier: Math.min(5, Math.max(1, Math.ceil(batteryLevel / 20)))
    });
  }

  /**
   * Helper for Canned Emergency Status (10 Bytes)
   */
  public static getCannedStatusLabel(code: number): string {
    switch (code) {
      case 0x01: return 'ปลอดภัยดี (Safe & Secure)';
      case 0x02: return 'ติดอยู่ในอาคาร (Trapped / Need Extraction)';
      case 0x03: return 'ต้องการแพทย์/ยา (Need Medical Aid)';
      case 0x04: return 'ต้องการน้ำดื่ม/อาหาร (Need Food & Water)';
      case 0x05: return 'ระดับน้ำกำลังเพิ่มสูง (Flood Danger)';
      case 0x06: return 'มีเพลิงไหม้/ก๊าซพิษ (Fire / Hazardous Gas)';
      default: return 'แจ้งเหตุฉุกเฉิน (Emergency Alert)';
    }
  }
}

