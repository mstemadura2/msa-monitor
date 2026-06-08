// ============================================================================
// MSA Monitor — Auth Configuration
// ============================================================================
import { randomBytes } from 'crypto';

// Password from env variable
const MONITOR_PASSWORD = process.env.MONITOR_PASSWORD || 'msa2026admin';

// Session token validity (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Simple token generation
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Validate password
export function validatePassword(password: string): boolean {
  return password === MONITOR_PASSWORD;
}

// Create session token
export function createSession(): { token: string; expires: number } {
  const token = generateToken();
  const expires = Date.now() + SESSION_DURATION;

  // Store in memory (simple approach for single-server)
  activeSessions.set(token, expires);

  return { token, expires };
}

// Validate session token
export function validateSession(token: string): boolean {
  const expires = activeSessions.get(token);
  if (!expires) return false;
  if (Date.now() > expires) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

// Destroy session
export function destroySession(token: string): void {
  activeSessions.delete(token);
}

// In-memory session store
const activeSessions = new Map<string, number>();

// Clean expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, expires] of activeSessions) {
    if (now > expires) activeSessions.delete(token);
  }
}, 60 * 60 * 1000);

// Cookie name
export const SESSION_COOKIE = 'msa-monitor-session';
