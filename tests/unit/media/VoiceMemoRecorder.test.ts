/**
 * Unit tests for VoiceMemoRecorder (Opus Mono 6-12kbps, 15s limit, Preview & Confirm)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import {
  VoiceMemoRecorder,
  MAX_VOICE_MEMO_DURATION_SEC
} from '../../../src/core/media/VoiceMemoRecorder';

describe('VoiceMemoRecorder (Opus Voice Memo & 15s Limit)', () => {
  it('should enforce 15s maximum duration and compact ~15KB size limit', () => {
    const specs = VoiceMemoRecorder.getAudioSpecs();

    expect(specs.maxDurationSec).toBe(15);
    expect(specs.channels).toBe(1); // Mono
    expect(specs.codec).toBe('audio/opus');
    expect(specs.estimatedMaxBytes).toBeLessThanOrEqual(16 * 1024);
    expect(specs.requiresUserConfirmation).toBe(true);
  });

  it('should reject recordings exceeding 15 seconds', () => {
    const res = VoiceMemoRecorder.validateVoiceMemo(16.5, true);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('exceeds 15s hard limit');
  });

  it('should require explicit user confirmation before dispatch', () => {
    const unconfirmed = VoiceMemoRecorder.validateVoiceMemo(10.0, false);
    expect(unconfirmed.isValid).toBe(false);
    expect(unconfirmed.error).toContain('requires explicit user review');

    const confirmed = VoiceMemoRecorder.validateVoiceMemo(10.0, true);
    expect(confirmed.isValid).toBe(true);
  });
});
