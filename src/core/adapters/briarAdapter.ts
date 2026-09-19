/**
 * Briar Bramble Transport Protocol (BTP) Adapter & Cross-Bridge
 * Encapsulates TOG v1.1 packets into Briar Bramble Data Frame format
 * Enables cross-network disaster communication between TOG and Briar nodes
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Briar Bramble Cross-Link
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { ITOGPacket } from '../protocol/TOGPacket';
import { PacketSerializer } from '../protocol/PacketSerializer';

export interface IBrambleFrame {
  streamId: number;
  frameSequence: number;
  payloadLength: number;
  data: Uint8Array;
}

export class BriarAdapter {
  public static readonly BRIAR_TOG_STREAM_ID = 0x47; // 'G' for OutGrid

  /**
   * Packages TOG packet into a Briar Bramble Transport frame
   */
  public static togToBriar(packet: ITOGPacket, frameSequence = 0): IBrambleFrame {
    const rawPacket = PacketSerializer.serialize(packet);
    return {
      streamId: BriarAdapter.BRIAR_TOG_STREAM_ID,
      frameSequence,
      payloadLength: rawPacket.length,
      data: rawPacket,
    };
  }

  /**
   * Extracts TOG packet from Briar Bramble Transport frame
   */
  public static briarToTog(frame: IBrambleFrame): ITOGPacket {
    if (frame.streamId !== BriarAdapter.BRIAR_TOG_STREAM_ID) {
      throw new Error(`Invalid Briar Stream ID: 0x${frame.streamId.toString(16)}`);
    }

    return PacketSerializer.deserialize(frame.data);
  }
}
