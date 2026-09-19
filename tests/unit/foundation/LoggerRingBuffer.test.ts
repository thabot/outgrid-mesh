import { describe, it, expect, beforeEach } from 'bun:test';
import { Logger, LogLevel } from '@core/utils/Logger';

describe('LoggerRingBuffer (Phase 1 Task 1.5.3)', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.getInstance();
    logger.clearBuffer();
    logger.muteConsole(true); // Don't spam test console
    logger.setMinLevel(LogLevel.DEBUG);
  });

  it('should store logs in RAM and enforce FIFO eviction at exactly 500 entries', () => {
    // Write 600 logs
    for (let i = 1; i <= 600; i++) {
      logger.info('TEST', `Log message index ${i}`);
    }

    expect(logger.getBufferSize()).toBe(500);

    const logs = logger.getRecentLogs(500);
    expect(logs).toHaveLength(500);

    // Oldest 100 entries (1 to 100) must be evicted
    expect(logs[0]?.message).toBe('Log message index 101');
    expect(logs[499]?.message).toBe('Log message index 600');
  });

  it('should mask 64-char private keys and sensitive secrets', () => {
    const rawKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const entry = logger.warn('CRYPTO', `Key generated: privateKey=${rawKey}`);
    expect(entry?.message).toContain('[REDACTED_KEY]');
    expect(entry?.message).not.toContain(rawKey);
  });

  it('should mask high-precision raw GPS coordinates', () => {
    const rawGps = 'Victim found at latitude:13.7563309 and longitude:100.5017651';
    const entry = logger.criticalSos('SOS', rawGps);
    expect(entry?.message).toContain('[REDACTED_GPS]');
    expect(entry?.message).not.toContain('13.7563309');
  });

  it('should mask private chat text body', () => {
    const rawText = 'Dispatch: chatBody="Meeting secretly at coordinates X"';
    const entry = logger.info('CHAT', rawText);
    expect(entry?.message).toContain('[REDACTED_TEXT]');
    expect(entry?.message).not.toContain('Meeting secretly');
  });

  it('should respect minimum log level filtering', () => {
    logger.setMinLevel(LogLevel.WARN);

    const debugEntry = logger.debug('TAG', 'debug message');
    const infoEntry = logger.info('TAG', 'info message');
    const warnEntry = logger.warn('TAG', 'warning message');
    const errorEntry = logger.error('TAG', 'error message');

    expect(debugEntry).toBeNull();
    expect(infoEntry).toBeNull();
    expect(warnEntry).not.toBeNull();
    expect(errorEntry).not.toBeNull();
    expect(logger.getBufferSize()).toBe(2);
  });
});
