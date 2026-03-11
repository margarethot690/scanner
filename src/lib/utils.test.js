import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (className merge utility)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('deduplicates tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('handles undefined/null', () => {
    expect(cn(undefined, null, 'valid')).toBe('valid');
  });

  it('handles empty call', () => {
    expect(cn()).toBe('');
  });

  it('merges conflicting tailwind utilities', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
