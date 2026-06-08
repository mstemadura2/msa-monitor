// ============================================================================
// MSA Monitor — Auth Configuration (Edge & Node.js compatible)
// ============================================================================

// Password from env variable
const MONITOR_PASSWORD = process.env.MONITOR_PASSWORD || 'msa2026admin';

// Secret for signing tokens
const TOKEN_SECRET = process.env.MONITOR_TOKEN_SECRET || 'msa-monitor-secret-key-2026';

// Session token validity (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Cookie name
export const SESSION_COOKIE = 'msa-monitor-session';

// Validate password
export function validatePassword(password: string): boolean {
  return password === MONITOR_PASSWORD;
}

// Create a signed session token (format: expiry.signature)
// Uses simple hash - not cryptographic but sufficient for internal monitor
export async function createSession(): Promise<{ token: string; expires: number }> {
  const expires = Date.now() + SESSION_DURATION;
  const signature = await signValue(expires.toString());
  const token = `${expires}.${signature}`;
  return { token, expires };
}

// Validate session token (works in both Edge and Node.js)
export async function validateSession(token: string): Promise<boolean> {
  if (!token || !token.includes('.')) return false;

  const dotIndex = token.indexOf('.');
  const expiryStr = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);
  const expiry = parseInt(expiryStr, 10);

  // Check if expired
  if (isNaN(expiry) || Date.now() > expiry) return false;

  // Verify signature
  const expectedSig = await signValue(expiryStr);
  return signature === expectedSig;
}

// Destroy session (no-op for stateless tokens)
export function destroySession(_token: string): void {
  // Stateless - client removes cookie
}

// Sign using Web Crypto API (works in both Edge and Node.js)
async function signValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  // Convert to hex string, take first 32 chars
  const hexArray = Array.from(new Uint8Array(signature));
  return hexArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
