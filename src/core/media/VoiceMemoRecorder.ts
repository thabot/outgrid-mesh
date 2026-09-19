/**
 * Voice Memo Recorder & Opus Codec Policy Engine (15s limit)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Media Engine
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export const MAX_VOICE_MEMO_DURATION_SEC = 15; // Strict 15s Hard Limit
export const TARGET_BITRATE_BPS = 8000;         // 8 kbps Mono Opus

export interface IVoiceMemoSpecs {
  maxDurationSec: number;
  sampleRateHz: number;
  channels: number; // 1 = Mono
  codec: 'audio/opus';
  estimatedMaxBytes: number;
  requiresUserConfirmation: boolean;
}

export class VoiceMemoRecorder {
  /**
   * Returns audio recording specifications compliant with TOG v1.1
   */
  public static getAudioSpecs(): IVoiceMemoSpecs {
    // 8000 bps * 15 sec / 8 = 15,000 Bytes (~15 KB maximum)
    const estimatedMaxBytes = Math.ceil((TARGET_BITRATE_BPS * MAX_VOICE_MEMO_DURATION_SEC) / 8);

    return {
      maxDurationSec: MAX_VOICE_MEMO_DURATION_SEC,
      sampleRateHz: 16000, // 16 kHz Wideband speech
      channels: 1,         // Mono
      codec: 'audio/opus',
      estimatedMaxBytes,
      requiresUserConfirmation: true // User must review & confirm send
    };
  }

  /**
   * Validates recorded voice memo: enforces 15s limit and confirms user review
   */
  public static validateVoiceMemo(
    durationSeconds: number,
    isConfirmedByUser: boolean
  ): { isValid: boolean; error?: string } {
    if (durationSeconds <= 0) {
      return { isValid: false, error: 'Voice memo is empty' };
    }

    if (durationSeconds > MAX_VOICE_MEMO_DURATION_SEC) {
      return {
        isValid: false,
        error: `Voice memo exceeds 15s hard limit (${durationSeconds.toFixed(1)}s)`
      };
    }

    if (!isConfirmedByUser) {
      return {
        isValid: false,
        error: 'Voice memo requires explicit user review and confirmation before sending'
      };
    }

    return { isValid: true };
  }
}
