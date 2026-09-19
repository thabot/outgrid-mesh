/**
 * Universal Disaster Logging Architecture with 500-Item In-Memory Ring Buffer & Privacy Masking
 * Protocol: TOG v1.1 Foundation
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL_SOS = 4
}

export interface ILogEntry {
  id: number;
  level: LogLevel;
  levelName: string;
  tag: string;
  message: string;
  timestamp: number;
  data?: unknown;
}

export class Logger {
  private static instance: Logger;
  private readonly maxBufferSize = 500;
  private buffer: ILogEntry[] = [];
  private currentId = 1;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private isConsoleMuted: boolean = false;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public muteConsole(mute: boolean): void {
    this.isConsoleMuted = mute;
  }

  public clearBuffer(): void {
    this.buffer = [];
    this.currentId = 1;
  }

  public getBufferSize(): number {
    return this.buffer.length;
  }

  public getRecentLogs(limit?: number): ILogEntry[] {
    const lim = limit || this.maxBufferSize;
    return this.buffer.slice(-lim);
  }

  /**
   * Log Masking & Privacy Guard:
   * Strips raw private keys, fine GPS coordinates, and private text payloads.
   */
  public static maskSensitiveData(content: string): string {
    if (!content) return content;
    let masked = content;

    // 1. Mask 64-character / 32-byte Base64/Hex private keys
    masked = masked.replace(/([0-9a-fA-F]{64})/g, '[REDACTED_KEY]');
    masked = masked.replace(/(privateKey[:=]\s*["']?)[^"'\s,]+/gi, '$1[REDACTED_KEY]');
    masked = masked.replace(/(secret[:=]\s*["']?)[^"'\s,]+/gi, '$1[REDACTED_KEY]');

    // 2. Mask High-Precision Raw GPS (e.g. 13.7563309, 100.5017651)
    masked = masked.replace(/(-?\d{1,3}\.\d{4,10}),\s*(-?\d{1,3}\.\d{4,10})/g, '[REDACTED_GPS]');
    masked = masked.replace(/(latitude[:=]\s*["']?)-?\d{1,3}\.\d{4,10}/gi, '$1[REDACTED_GPS]');
    masked = masked.replace(/(longitude[:=]\s*["']?)-?\d{1,3}\.\d{4,10}/gi, '$1[REDACTED_GPS]');

    // 3. Mask Private Chat Text Content
    masked = masked.replace(/(rawMessage[:=]\s*["']?)[^"'\n}]+/gi, '$1[REDACTED_TEXT]');
    masked = masked.replace(/(chatBody[:=]\s*["']?)[^"'\n}]+/gi, '$1[REDACTED_TEXT]');

    return masked;
  }

  private appendLog(level: LogLevel, tag: string, rawMessage: string, data?: unknown): ILogEntry | null {
    if (level < this.minLevel) {
      return null;
    }

    const maskedMessage = Logger.maskSensitiveData(rawMessage);
    const entry: ILogEntry = {
      id: this.currentId++,
      level,
      levelName: LogLevel[level],
      tag,
      message: maskedMessage,
      timestamp: Date.now(),
      data
    };

    // FIFO Ring Buffer eviction when exceeding 500 items
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift(); // Evict oldest
    }
    this.buffer.push(entry);

    if (!this.isConsoleMuted) {
      const output = `[${entry.levelName}][${entry.tag}] ${entry.message}`;
      if (level === LogLevel.CRITICAL_SOS || level === LogLevel.ERROR) {
        console.error(output);
      } else if (level === LogLevel.WARN) {
        console.warn(output);
      } else {
        console.log(output);
      }
    }

    return entry;
  }

  public debug(tag: string, message: string, data?: unknown): ILogEntry | null {
    return this.appendLog(LogLevel.DEBUG, tag, message, data);
  }

  public info(tag: string, message: string, data?: unknown): ILogEntry | null {
    return this.appendLog(LogLevel.INFO, tag, message, data);
  }

  public warn(tag: string, message: string, data?: unknown): ILogEntry | null {
    return this.appendLog(LogLevel.WARN, tag, message, data);
  }

  public error(tag: string, message: string, data?: unknown): ILogEntry | null {
    return this.appendLog(LogLevel.ERROR, tag, message, data);
  }

  public criticalSos(tag: string, message: string, data?: unknown): ILogEntry | null {
    return this.appendLog(LogLevel.CRITICAL_SOS, tag, message, data);
  }
}
