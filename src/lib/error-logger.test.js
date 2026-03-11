import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logError, getErrorLog } from './error-logger';

describe('error-logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs an error and stores it in the log', () => {
    logError(new Error('test error'), { type: 'test' });
    const log = getErrorLog();
    const entry = log.find(e => e.message === 'test error');
    expect(entry).toBeDefined();
    expect(entry.type).toBe('test');
    expect(entry.timestamp).toBeDefined();
  });

  it('handles non-Error objects', () => {
    logError('string error');
    const log = getErrorLog();
    const entry = log.find(e => e.message === 'string error');
    expect(entry).toBeDefined();
  });

  it('returns a copy of the log (not the internal array)', () => {
    logError(new Error('a'));
    const log1 = getErrorLog();
    const log2 = getErrorLog();
    expect(log1).not.toBe(log2);
    expect(log1).toEqual(log2);
  });

  it('logs to console.error', () => {
    logError(new Error('console test'));
    expect(console.error).toHaveBeenCalledWith(
      '[ErrorLogger]',
      'console test',
      expect.any(Object)
    );
  });
});
