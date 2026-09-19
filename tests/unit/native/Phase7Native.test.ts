/**
 * Phase 7: Android Native Layer, Foreground Service & Battery Duty Cycle Unit Tests
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 7
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { ForegroundService } from '../../../src/core/native/ForegroundService';
import { DozeModeResilience } from '../../../src/core/native/DozeModeResilience';
import { DutyCycleManager, DutyCycleMode } from '../../../src/core/battery/DutyCycleManager';
import { MeshtasticAdapter } from '../../../src/core/adapters/meshtasticAdapter';
import { BriarAdapter } from '../../../src/core/adapters/briarAdapter';
import { HaLowAdapter } from '../../../src/core/adapters/halowAdapter';
import { TOG_MAGIC, TOGPacketType, TOGPriority, type ITOGPacket } from '../../../src/core/protocol/TOGPacket';

describe('Phase 7: Android Native Layer, Foreground Service & Battery Duty Cycle', () => {
  describe('Task 7.1: Android Foreground Service & Disciplined WakeLock', () => {
    let service: ForegroundService;

    beforeEach(() => {
      service = new ForegroundService();
    });

    it('should start 24/7 background service with sticky non-dismissible notification', () => {
      const notif = service.startForeground();
      expect(service.isRunning()).toBe(true);
      expect(notif.isOngoing).toBe(true);
      expect(notif.channelId).toBe('outgrid_emergency_mesh_channel');
      expect(notif.title).toContain('OutGrid Mesh');
    });

    it('should acquire partial WakeLock disciplined only while service is running', () => {
      expect(service.acquireWakeLock()).toBe(false);

      service.startForeground();
      expect(service.acquireWakeLock()).toBe(true);
      expect(service.isWakeLockHeld()).toBe(true);

      service.releaseWakeLock();
      expect(service.isWakeLockHeld()).toBe(false);
    });

    it('should auto-release WakeLock and stop service cleanly', () => {
      service.startForeground();
      service.acquireWakeLock();
      service.stopForeground();

      expect(service.isRunning()).toBe(false);
      expect(service.isWakeLockHeld()).toBe(false);
    });
  });

  describe('Task 7.2: Doze Mode Resilience & AlarmManager Intermittent Wakeup', () => {
    it('should manage battery optimization whitelist and schedule idle wakeups', () => {
      const doze = new DozeModeResilience(60000);
      expect(doze.getIsBatteryOptimizationIgnored()).toBe(false);

      doze.setBatteryOptimizationIgnored(true);
      expect(doze.getIsBatteryOptimizationIgnored()).toBe(true);

      const now = 1726700000000;
      const alarm = doze.scheduleIdleWakeup(now);
      expect(alarm.allowWhileIdle).toBe(true);
      expect(alarm.type).toBe('RTC_WAKEUP');
      expect(alarm.triggerAtMillis).toBe(now + 60000);
      expect(doze.getNextScheduledAlarm()).toEqual(alarm);

      doze.cancelScheduledWakeup();
      expect(doze.getNextScheduledAlarm()).toBeNull();
    });
  });

  describe('Task 7.3: Adaptive 4-Tier Battery Duty Cycle (< 0.2%/hr drain)', () => {
    it('should assign NORMAL mode (> 50%) with 50% duty ratio', () => {
      const duty = new DutyCycleManager(85);
      const w = duty.getDutyCycleWindow();
      expect(w.mode).toBe(DutyCycleMode.NORMAL);
      expect(w.scanDurationMs).toBe(2500);
      expect(w.sleepDurationMs).toBe(2500);
      expect(w.dutyRatioPct).toBe(50.0);
      expect(w.allowHighThroughputMedia).toBe(true);
      expect(w.canRelayForOthers).toBe(true);
    });

    it('should assign SAVER mode (20 - 50%) with 25% duty ratio', () => {
      const duty = new DutyCycleManager(35);
      const w = duty.getDutyCycleWindow();
      expect(w.mode).toBe(DutyCycleMode.SAVER);
      expect(w.scanDurationMs).toBe(1500);
      expect(w.sleepDurationMs).toBe(4500);
      expect(w.allowHighThroughputMedia).toBe(false);
      expect(w.canRelayForOthers).toBe(true);
    });

    it('should assign LOW mode (10 - 20%) and disable relaying for others', () => {
      const duty = new DutyCycleManager(15);
      const w = duty.getDutyCycleWindow();
      expect(w.mode).toBe(DutyCycleMode.LOW);
      expect(w.scanDurationMs).toBe(1000);
      expect(w.sleepDurationMs).toBe(9000);
      expect(w.canRelayForOthers).toBe(false);
    });

    it('should assign DEEP_HIBERNATION mode (< 10%) with drain < 0.2%/hr for 24-48h life preservation', () => {
      const duty = new DutyCycleManager(6);
      const w = duty.getDutyCycleWindow();
      expect(w.mode).toBe(DutyCycleMode.DEEP_HIBERNATION);
      expect(w.scanDurationMs).toBe(50);
      expect(w.sleepDurationMs).toBe(58000);
      expect(w.canRelayForOthers).toBe(false);

      const drainRate = duty.getEstimatedHourlyDrainPct();
      expect(drainRate).toBeLessThan(0.2); // Strict acceptance criteria: < 0.2%/hr
    });

    it('should override to NORMAL mode when plugged in even with critical battery', () => {
      const duty = new DutyCycleManager(4, true);
      const w = duty.getDutyCycleWindow();
      expect(w.mode).toBe(DutyCycleMode.NORMAL);
      expect(w.allowHighThroughputMedia).toBe(true);
    });
  });

  describe('Task 7.5: Protocol Bridge Adapters Layer (Meshtastic, Briar BTP, Wi-Fi HaLow)', () => {
    const mockPacket: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.SOS_BEACON,
        ttlHops: 7,
        priority: TOGPriority.CRITICAL,
        flags: 0,
        reserved: 0,
      },
      messageId: 0x1122334455667788n,
      senderPubkeyHash: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      recipientHash: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
      targetH3Index: 0x8928308280fffff0n,
      payloadLength: 4,
      payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    };

    it('should bi-directionally translate TOG v1.1 packet to Meshtastic LoRa frame', () => {
      const loraPayload = MeshtasticAdapter.togToMeshtastic(mockPacket);
      expect(loraPayload.portnum).toBe(MeshtasticAdapter.TOG_LORA_PORTNUM);
      expect(loraPayload.hopLimit).toBe(7);

      const restoredPacket = MeshtasticAdapter.meshtasticToTog(loraPayload);
      expect(restoredPacket.header.magic).toBe(TOG_MAGIC);
      expect(restoredPacket.messageId).toBe(mockPacket.messageId);
      expect(restoredPacket.payload).toEqual(mockPacket.payload);
    });

    it('should bi-directionally translate TOG v1.1 packet to Briar Bramble Transport frame', () => {
      const bramble = BriarAdapter.togToBriar(mockPacket, 1);
      expect(bramble.streamId).toBe(BriarAdapter.BRIAR_TOG_STREAM_ID);

      const restored = BriarAdapter.briarToTog(bramble);
      expect(restored.header.magic).toBe(TOG_MAGIC);
      expect(restored.messageId).toBe(mockPacket.messageId);
      expect(restored.payload).toEqual(mockPacket.payload);
    });

    it('should initialize and implement IProtocolAdapter on Wi-Fi HaLow Sub-1GHz adapter', async () => {
      const halow = new HaLowAdapter({ frequencyBand: '920MHz', channelWidth: 2 });
      expect(halow.protocolName).toBe('IEEE-802.11ah-HaLow');
      expect(halow.isConnected).toBe(false);

      await halow.initialize();
      const connected = await halow.connect();
      expect(connected).toBe(true);
      expect(halow.isConnected).toBe(true);

      let packetReceived = false;
      halow.onInboundPacket(() => { packetReceived = true; });

      const sent = await halow.relayOutbound(mockPacket);
      expect(sent).toBe(true);

      await halow.disconnect();
      expect(halow.isConnected).toBe(false);
    });
  });
});
