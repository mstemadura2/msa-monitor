// ============================================================================
// MSA Monitor — Session Check API Route
// ============================================================================
import { NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE } from '@/lib/auth';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split('; ')
    .find(c => c.startsWith(SESSION_COOKIE + '='))
    ?.split('=')[1];

  if (!token || !(await validateSession(token))) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
