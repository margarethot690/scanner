/**
 * Shared validation utilities for cloud functions.
 * Prevents SSRF attacks and validates inputs.
 */

const ALLOWED_PROTOCOLS = ['https:'];
const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', 'metadata.google.internal'];

/**
 * Validates and sanitizes a node URL to prevent SSRF.
 * Only allows HTTPS URLs to public hosts.
 */
export function validateNodeUrl(nodeUrl: string | undefined | null, fallback: string): string {
  const raw = (nodeUrl || fallback || '').trim().replace(/\/$/, '');
  
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid node URL format');
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('URL points to a blocked host');
  }

  // Block private IP ranges
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) {
    throw new Error('URL points to a private network');
  }

  return parsed.origin;
}

/**
 * Validates that a value is a positive integer within range.
 */
export function validatePositiveInt(value: unknown, name: string, max = 2_147_483_647): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0 || num > max) {
    throw new Error(`${name} must be a positive integer (got ${value})`);
  }
  return num;
}
