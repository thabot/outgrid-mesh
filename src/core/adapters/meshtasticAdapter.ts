/**
 * Meshtastic LoRa Protocol Adapter & Bridge
 * Bridges TOG v1.1 Emergency Packets to/from LoRa Meshtastic Mesh Broadcasts
 * Supports ESP32 LoRa hardware interface via Serial / Bluetooth SPP
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 LoRa Cross-Link
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { ITOGPacket, TOGPacketType, TOGPriority } from '../protocol/TOGPacket';
import { PacketSerializer } from '../protocol/PacketSerializer';

export interface IMeshtasticDataPayload {
  portnum: number; // e.g. 256 for TEXT_MESSAGE_APP, or 64 for PRIVATE_APP
  payload: Uint8Array;
  wantAck: boolean;
  hopLimit: number;
}

export class MeshtasticAdapter {
  public static readonly TOG_LORA_PORTNUM = 77; // Custom TOG port on Meshtastic protobuf

  /**
   * Converts a TOG v1.1 Packet into a Meshtastic LoRa radio frame
   */
  public static togToMeshtastic(packet: ITOGPacket): IMeshtasticDataPayload {
    // Serialize TOG wire format
    const serialized = PacketSerializer.serialize(packet);

    return {
      portnum: MeshtasticAdapter.TOG_LORA_PORTNUM,
      payload: serialized,
      wantAck: packet.header.packetType === TOGPacketType.DIRECT_CHAT,
      hopLimit: Math.min(packet.header.ttlHops, 7), // LoRa mesh standard hop limit 3-7
    };
  }

  /**
   * Converts a received Meshtastic LoRa frame back into TOG v1.1 Packet
   */
  public static meshtasticToTog(meshData: IMeshtasticDataPayload): ITOGPacket {
    if (meshData.portnum !== MeshtasticAdapter.TOG_LORA_PORTNUM) {
      throw new Error(`Unsupported Meshtastic portnum: ${meshData.portnum}`);
    }

    return PacketSerializer.deserialize(meshData.payload);
  }
}
