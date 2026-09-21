/**
 * Thabot OutGrid Protocol (TOG v1.1) Wire Specification & Frame Types
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Wire Format
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export const TOG_MAGIC = 0x544F; // ASCII 'TO' (Thabot OutGrid)
export const TOG_VERSION = 1;

export enum TOGPacketType {
  SOS_BEACON = 0x01,
  DIRECT_CHAT = 0x02,
  GROUP_CHAT = 0x03,
  CRISIS_FEED = 0x04,
  DELIVERY_ACK = 0x05,
  DELIVERY_NACK = 0x06,
  PRESENCE_CHIRP = 0x07
}

export enum TOGPriority {
  LOW = 0x0,
  NORMAL = 0x1,
  HIGH = 0x2,
  CRITICAL_SOS = 0x3
}

/**
 * Standard Default Hop Limits (TTL) by packet classification
 * Optimized for disaster resilience & flood reach while maintaining power efficiency
 */
export const DEFAULT_SOS_HOPS = 25;         // Max penetration for life-critical SOS (~1.5 - 2.5km BLE)
export const DEFAULT_ACK_HOPS = 25;         // Symmetric return path for delivery acknowledgment
export const DEFAULT_CRISIS_FEED_HOPS = 20; // Official disaster alerts & evacuation notices
export const DEFAULT_CHAT_HOPS = 8;         // Standard direct/group communications
export const DEFAULT_PRESENCE_HOPS = 2;     // Neighbor discovery link-local scope

export interface ITOGHeader {
  magic: number;             // 16 bits (0x544F)
  version: number;           // 3 bits (0b001)
  packetType: TOGPacketType; // 5 bits (0x01 - 0x07)
  ttlHops: number;           // 8 bits (0 - 255)
  priority: TOGPriority;     // 4 bits (0x0 - 0xF)
  flags: number;             // 3 bits (0b000 - 0b111)
  reserved: number;          // 3 bits (0b000)
}

export interface ITOGPacket {
  header: ITOGHeader;
  messageId: bigint;           // 64-bit uint (8 Bytes)
  senderPubkeyHash: Uint8Array; // 8 Bytes (truncated SHA-256)
  recipientHash: Uint8Array;    // 8 Bytes (recipient / topic hash)
  targetH3Index: bigint;        // 64-bit uint (8 Bytes)
  payloadLength: number;        // 16-bit uint (2 Bytes)
  payload: Uint8Array;          // Variable payload data
}

/**
 * H3 Local Delta Offset (4 Bytes)
 * High-precision GPS delta relative to Target H3 Hexagon center (< 1m precision)
 */
export interface IH3LocalDeltaOffset {
  deltaX: number; // int16 (-1500m to +1500m)
  deltaY: number; // int16 (-1500m to +1500m)
}

/**
 * H3 Hexagonal 6-Direction index relative to our cell
 * Fits in 3 bits (0b000 - 0b110)
 */
export enum H3Direction {
  SAME_CELL = 0,
  NORTH = 1,
  NORTH_EAST = 2,
  SOUTH_EAST = 3,
  SOUTH = 4,
  SOUTH_WEST = 5,
  NORTH_WEST = 6
}

/**
 * Presence Chirp Status Flags (Upper 4 bits of Byte 4)
 */
export enum PresenceStatusFlags {
  NONE = 0x0,
  BT_LEGACY_LEAF = 1 << 0,      // 0x1: Leaf node (BT 4.0 - 4.2 / Legacy 1M PHY, excluded from multi-hop relay)
  BLE_CODED_CAPABLE = 1 << 1,   // 0x2: Node supports BLE 5.0+ Coded PHY Long Range S=8
  RESERVED_FLAG_2 = 1 << 2,     // 0x4
  RESERVED_FLAG_3 = 1 << 3      // 0x8
}

/**
 * 3-Bit Header Flags inside Byte 4 of Main TOG Packet Header
 */
export enum TOGHeaderFlags {
  NONE = 0x0,
  IS_COMPRESSED = 1 << 0,     // 0x1: Payload compressed with Deflate (Level 6)
  IS_DIRECT_LEAF = 1 << 1,    // 0x2: Target recipient is leaf node (BT 4.2)
  RESERVED_CRYPTO = 1 << 2    // 0x4: Reserved for Ratchet E2EE Flag
}

/**
 * 32 Technical Combination Codes for Byte 9 (Bits 3-7)
 */
export enum RadioCombinationCode {
  STANDBY_ALL_OFF = 0,         // ปิดวิทยุเสริมทั้งหมด (สแตนด์บายประหยัดพลังงาน)
  BT_LEGACY_ONLY = 1,          // เปิดเฉพาะ BT 4.2 Legacy (10–30m) (เช่น Newland MT65)
  BLE_CODED_ONLY = 2,          // เปิดเฉพาะ BLE 5.0 Long Range (100–300m)
  DUAL_BT_ONLY = 3,            // เปิด Bluetooth 2 ท่อคู่ขนาน (สลับยิง Coded + Legacy)
  LORA_BRIDGE_ONLY = 4,        // โหนด LoRa Bridge เดี่ยว (Repeater ทวนสัญญาณยอดเขา 15–20km)
  GATEWAY_ONLY = 5,            // โหนดที่มีสัญญาณเน็ตเดี่ยวๆ (เราเตอร์ 4G/5G หรือ Starlink)
  BT_LEGACY_LORA = 6,          // Newland MT65 ต่อกล่อง LoRa
  BT_LEGACY_GATEWAY = 7,       // Newland MT65 ใส่ซิม 4G ทำหน้าที่เป็น Gateway
  BT_LEGACY_WIFI = 8,          // Newland MT65 เปิด Wi-Fi Direct
  BLE_CODED_LORA = 9,          // มือถือรุ่นใหม่ + กล่อง LoRa พกพา (ชุดมาตรฐานทีมกู้ภัย)
  BLE_CODED_GATEWAY = 10,      // มือถือรุ่นใหม่มีเน็ต 4G/5G/Satellite
  BLE_CODED_WIFI_DIRECT = 11,  // มือถือรุ่นใหม่เปิด Wi-Fi Direct ส่งไฟล์/APK
  BLE_CODED_WIFI_HALOW = 12,   // มือถือรุ่นใหม่รับภาพ/โดรนผ่าน Wi-Fi HaLow Sub-1GHz
  BLE_CODED_LORA_GATEWAY = 13, // มือถือรุ่นใหม่มีเน็ต + LoRa
  DUAL_BT_LORA = 14,           // ยิงบลูทูธ 2 ท่อคู่ขนาน + LoRa 15–20km
  DUAL_BT_GATEWAY = 15,        // ยิงบลูทูธ 2 ท่อ + ดึงข้อมูลออกเน็ต
  DUAL_BT_WIFI = 16,           // ยิงบลูทูธ 2 ท่อ + Wi-Fi ส่งไฟล์
  DUAL_BT_LORA_GATEWAY = 17,   // บลูทูธ 2 ท่อ + LoRa + เน็ต 4G/ดาวเทียม
  DUAL_BT_LORA_WIFI = 18,      // บลูทูธ 2 ท่อ + LoRa + Wi-Fi
  FULL_BACKBONE_HALOW = 19,    // BLE_CODED + LORA + WIFI_HALOW + GATEWAY (เสาโดรน)
  FULL_BACKBONE_DUAL_BT = 20,  // DUAL_BT + LORA + WIFI_HALOW + GATEWAY (เสาศูนย์อพยพ)
  EMERGENCY_ALL_ACTIVE = 21,   // เปิดทุกระบบวิทยุพร้อมกัน 100%
  RESERVED_SATELLITE = 22,     // สำรอง: Direct-to-Cell Satellite Radio
  RESERVED_DMR_RADIO = 23,     // สำรอง: ดิจิทัล ว. วิทยุสื่อสาร (DMR)
  RESERVED_BT6_CS_1 = 24,      // สำรอง: Bluetooth 6.0 Channel Sounding
  RESERVED_FUTURE_2 = 25,
  RESERVED_FUTURE_3 = 26,
  RESERVED_FUTURE_4 = 27,
  RESERVED_FUTURE_5 = 28,
  RESERVED_FUTURE_6 = 29,
  RESERVED_FUTURE_7 = 30,
  RESERVED_FUTURE_8 = 31
}

export interface IRadioCapabilityUnpacked {
  isStationary: boolean;
  powerTier: number;
  comboCode: RadioCombinationCode;
  isLegacyBt: boolean;
  isRelayCapable: boolean;
  hasLoRa: boolean;
  hasInternetGateway: boolean;
}

export class RadioCapabilityHelper {
  /**
   * รวมสถานะโหนดเข้าเป็น Byte 9 (1 Byte uint8)
   */
  public static packRadioByte(
    isStationary: boolean,
    powerTier: number, // 0 - 3 (2 bits)
    comboCode: RadioCombinationCode // 0 - 31 (5 bits)
  ): number {
    const bit0 = isStationary ? 0x01 : 0x00;
    const bits12 = (Math.min(3, Math.max(0, powerTier)) & 0x03) << 1;
    const clampedCombo = Math.min(31, Math.max(0, comboCode));
    const bits37 = (clampedCombo & 0x1f) << 3;
    return bit0 | bits12 | bits37;
  }

  /**
   * ถอดรหัส Byte 9 ออกเป็นสถานะทางเทคนิคพร้อมบทบาทในเครือข่าย
   */
  public static unpackRadioByte(byte9: number): IRadioCapabilityUnpacked {
    const isStationary = (byte9 & 0x01) !== 0;
    const powerTier = (byte9 >> 1) & 0x03;
    let comboCode = ((byte9 >> 3) & 0x1f) as RadioCombinationCode;

    // Backward compatibility fallback for TOG v1.0 sparse masks
    if (byte9 === 0x08) {
      comboCode = RadioCombinationCode.BT_LEGACY_ONLY;
    } else if (byte9 === 0x0a) {
      comboCode = RadioCombinationCode.BLE_CODED_ONLY;
    } else if (comboCode < 0 || comboCode > 31) {
      comboCode = RadioCombinationCode.STANDBY_ALL_OFF;
    }

    const isLegacyBt = (
      comboCode === RadioCombinationCode.BT_LEGACY_ONLY ||
      comboCode === RadioCombinationCode.BT_LEGACY_LORA ||
      comboCode === RadioCombinationCode.BT_LEGACY_GATEWAY ||
      comboCode === RadioCombinationCode.BT_LEGACY_WIFI
    );

    const hasLoRa = (
      comboCode === RadioCombinationCode.LORA_BRIDGE_ONLY ||
      comboCode === RadioCombinationCode.BT_LEGACY_LORA ||
      comboCode === RadioCombinationCode.BLE_CODED_LORA ||
      comboCode === RadioCombinationCode.BLE_CODED_LORA_GATEWAY ||
      comboCode === RadioCombinationCode.DUAL_BT_LORA ||
      comboCode === RadioCombinationCode.DUAL_BT_LORA_GATEWAY ||
      comboCode === RadioCombinationCode.DUAL_BT_LORA_WIFI ||
      comboCode === RadioCombinationCode.FULL_BACKBONE_HALOW ||
      comboCode === RadioCombinationCode.FULL_BACKBONE_DUAL_BT ||
      comboCode === RadioCombinationCode.EMERGENCY_ALL_ACTIVE
    );

    const hasInternetGateway = (
      comboCode === RadioCombinationCode.GATEWAY_ONLY ||
      comboCode === RadioCombinationCode.BT_LEGACY_GATEWAY ||
      comboCode === RadioCombinationCode.BLE_CODED_GATEWAY ||
      comboCode === RadioCombinationCode.BLE_CODED_LORA_GATEWAY ||
      comboCode === RadioCombinationCode.DUAL_BT_GATEWAY ||
      comboCode === RadioCombinationCode.DUAL_BT_LORA_GATEWAY ||
      comboCode === RadioCombinationCode.FULL_BACKBONE_HALOW ||
      comboCode === RadioCombinationCode.FULL_BACKBONE_DUAL_BT ||
      comboCode === RadioCombinationCode.EMERGENCY_ALL_ACTIVE
    );

    const isRelayCapable = !isLegacyBt || hasLoRa;

    return {
      isStationary,
      powerTier,
      comboCode,
      isLegacyBt,
      isRelayCapable,
      hasLoRa,
      hasInternetGateway
    };
  }
}

/**
 * Compact SOS Beacon (21 Bytes Wire Format)
 */
export interface ICompactSOSBeacon {
  seqId: number;         // uint8 (0 - 255)
  h3Index: bigint;       // uint64 (Uber H3 Index Res 9)
  deltaX: number;        // int16 (-1500m ถึง +1500m จากจุดกึ่งกลาง Hexagon)
  deltaY: number;        // int16 (-1500m ถึง +1500m จากจุดกึ่งกลาง Hexagon)
  batteryPct: number;    // uint8 (0 - 100%)
  statusFlags: number;   // uint8 (บิต 0=Trapped, 1=Medical, 2=Fire, 3=Child, 4=Water)
}

/**
 * Compact Direct Chat (<= 28 Bytes Wire Format for BT 4.2 Adv)
 */
export interface ICompactDirectChat {
  senderShortId: number;    // uint16 (0 - 65,535)
  recipientShortId: number; // uint16 (0 - 65,535)
  truncatedMsgId: number;   // uint32 (4 Bytes)
  h3LowerRes9: number;      // uint16 (2 Bytes)
  textPayload: string;      // UTF-8 string สูงสุด 14 ไบต์
}

/**
 * Radio & Node Capabilities Bitmask (Byte 9 of Presence Chirp - Legacy compat)
 */
export enum RadioCapabilitiesBitmask {
  STATIONARY_NODE = 1 << 0,     // 0x01: Fixed node (tower/rooftop)
  POWER_TIER_MASK = 0x06,       // Bits 1-2: 00=Normal, 01=Critical<20%, 10=Charging, 11=Permanent
  BLE_ACTIVE = 1 << 3,          // 0x08: Bluetooth LE Active
  BT_LEGACY_ONLY = 1 << 3,      // 0x08: Legacy Bluetooth (BT 4.0-4.2 / 1M PHY / Leaf node only)
  BLE_CODED_LONG_RANGE = (1 << 3) | 0x02, // 0x0A: Modern BLE 5.0+ Coded PHY Long Range (Relay capable)
  LORA_BRIDGE_ACTIVE = 1 << 4,  // 0x10: LoRa Bridge Active (15-20km)
  WIFI_STANDARD_READY = 1 << 5, // 0x20: Wi-Fi Direct ready for APK Sideload (50-100m)
  WIFI_HALOW_ACTIVE = 1 << 6,   // 0x40: Wi-Fi HaLow 802.11ah Sub-1GHz Active (1-3km)
  INTERNET_GATEWAY = 1 << 7     // 0x80: Active Internet Outlink (Starlink/Cellular)
}

/**
 * Single Neighbor Record (3 Bytes inside 27-byte Presence Chirp)
 */
export interface IPresenceNeighbor {
  shortNodeId: number;   // 16 bits (0 - 65535)
  direction: H3Direction; // 3 bits (0 - 6)
  batteryLevel: number;  // 3 bits (1 - 5, 20% increments)
  rssiTier: number;      // 2 bits (0=Weak <-85dBm, 1=Med, 2=Good, 3=Strong >-60dBm)
}

/**
 * Decoded TOG v1.1 Presence Chirp Packet (27 Bytes Wire Format)
 */
export interface IPresenceChirp {
  packetType: TOGPacketType; // 5 bits (0x07)
  hopCount: number;          // 3 bits (0 - 7)
  ourShortNodeId: number;    // 24 bits (0 - 16,777,215)
  batteryLevel: number;      // 3 bits (1 - 5)
  isCharging: boolean;       // 1 bit
  statusFlags: number;       // 4 bits
  ourH3Index: number;        // 32 bits (Uber H3 Res 9)
  radioCapabilities: number; // 8 bits (Byte 9)
  neighbors: IPresenceNeighbor[]; // 0 to 5 neighbors (each 3 Bytes)
  crc16: number;             // 16 bits (CRC-16-CCITT)
  radioComboCode?: RadioCombinationCode; // Decoded combo code
  isLegacyBt?: boolean;      // True if leaf node
}

