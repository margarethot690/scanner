import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatAmount, truncate, fromUnix, timeAgo } from './formatters';

describe('formatAmount', () => {
  it('formats amount with default 8 decimals', () => {
    expect(formatAmount(100000000)).toBe('1');
  });

  it('formats amount with custom decimals', () => {
    expect(formatAmount(1000, 2)).toBe('10');
  });

  it('returns "0" for null/undefined', () => {
    expect(formatAmount(null)).toBe('0');
    expect(formatAmount(undefined)).toBe('0');
  });

  it('handles zero', () => {
    expect(formatAmount(0)).toBe('0');
  });

  it('formats large numbers', () => {
    const result = formatAmount(123456789012345, 8);
    expect(result).toContain('1');
  });

  it('formats fractional amounts', () => {
    const result = formatAmount(50000000, 8);
    expect(result).toBe('0.5');
  });
});

describe('truncate', () => {
  it('truncates long strings', () => {
    const long = 'abcdefghijklmnopqrstuvwxyz1234567890';
    const result = truncate(long, 10);
    expect(result).toBe('abcdefghij...1234567890');
  });

  it('returns short strings unchanged', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('returns empty string for null/undefined', () => {
    expect(truncate(null)).toBe('');
    expect(truncate(undefined)).toBe('');
    expect(truncate('')).toBe('');
  });

  it('respects custom truncation length', () => {
    const str = 'abcdefghijklmnopqrstuvwx';
    const result = truncate(str, 5);
    expect(result).toBe('abcde...tuvwx');
  });

  it('returns string as-is when length equals 2*n', () => {
    const str = 'abcdefghij'; // length 10, n=5, 2*5=10
    expect(truncate(str, 5)).toBe('abcdefghij');
  });
});

describe('fromUnix', () => {
  it('formats a valid timestamp', () => {
    const result = fromUnix(1704110400000); // 2024-01-01 12:00 UTC — midday avoids timezone date shift
    expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  });

  it('returns "N/A" for non-number', () => {
    expect(fromUnix(null)).toBe('N/A');
    expect(fromUnix(undefined)).toBe('N/A');
    expect(fromUnix('not a number')).toBe('N/A');
  });

  it('returns "N/A" for zero/negative', () => {
    expect(fromUnix(0)).toBe('N/A');
    expect(fromUnix(-1)).toBe('N/A');
  });

  it('returns "N/A" for Infinity', () => {
    expect(fromUnix(Infinity)).toBe('N/A');
    expect(fromUnix(-Infinity)).toBe('N/A');
  });
});

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns seconds ago', () => {
    const thirtySecondsAgo = Date.now() - 30 * 1000;
    expect(timeAgo(thirtySecondsAgo)).toBe('30s ago');
  });

  it('returns minutes ago', () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    expect(timeAgo(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const twoHoursAgo = Date.now() - 2 * 3600 * 1000;
    expect(timeAgo(twoHoursAgo)).toBe('2h ago');
  });

  it('returns days ago', () => {
    const threeDaysAgo = Date.now() - 3 * 86400 * 1000;
    expect(timeAgo(threeDaysAgo)).toBe('3d ago');
  });

  it('returns "in the future" for future timestamps', () => {
    const future = Date.now() + 60000;
    expect(timeAgo(future)).toBe('in the future');
  });

  it('returns "N/A" for invalid input', () => {
    expect(timeAgo(null)).toBe('N/A');
    expect(timeAgo(undefined)).toBe('N/A');
    expect(timeAgo(0)).toBe('N/A');
    expect(timeAgo(-1)).toBe('N/A');
    expect(timeAgo(Infinity)).toBe('N/A');
  });
});
