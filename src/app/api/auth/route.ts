// ============================================================================
// MSA Monitor — Login API Route
// ============================================================================
import { NextResponse } from 'next/server';
import { validatePassword, createSession, destroySession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password wajib diisi' }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    const session = createSession();

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: session.expires,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ authenticated: true });
}

export async function DELETE(request: Request) {
  const token = request.headers.get('cookie')
    ?.split('; ')
    ?.find(c => c.startsWith(SESSION_COOKIE + '='))
    ?.split('=')[1];

  if (token) destroySession(token);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });

  return response;
}
