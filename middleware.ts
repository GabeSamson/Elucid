import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCK_ALLOWLIST_PATHS = new Set([
  '/',
  '/account',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/sitemap.xml',
  '/robots.txt',
  '/favicon.ico',
  '/icon.png',
  '/Icon.png',
  '/logo.svg',
]);

const LOCK_ALLOWLIST_PREFIXES = [
  '/api',
  '/_next',
  '/uploads',
  '/.well-known',
  '/static',
  '/images',
  '/account/',
];

function getRequestOrigin(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('host') || request.nextUrl.host;
  return `${protocol}://${host}`;
}

function isLockBypassed(pathname: string) {
  if (LOCK_ALLOWLIST_PATHS.has(pathname)) {
    return true;
  }

  return LOCK_ALLOWLIST_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function isSiteLocked(origin: string) {
  try {
    const response = await fetch(`${origin}/api/homepage-config`, { cache: 'no-store' });

    if (!response.ok) {
      console.error('Error fetching homepage config status:', response.status);
      return false;
    }

    const data = await response.json();
    return Boolean(data?.config?.lockHomepage);
  } catch (error) {
    console.error('Error checking lock status:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect admin routes
  if (path.startsWith('/admin')) {
    const origin = getRequestOrigin(request);

    // Log all available cookies for debugging
    const allCookies = request.cookies.getAll();
    console.log('🍪 All cookies:', allCookies.map(c => c.name));

    // Check for session token cookie
    const sessionToken = request.cookies.get('next-auth.session-token') ||
                        request.cookies.get('__Secure-next-auth.session-token');

    console.log('🔐 Admin access attempt:', {
      path,
      hasSessionCookie: !!sessionToken,
      cookieName: sessionToken?.name
    });

    // Fetch the session from the API route to verify role
    // (We'll try this even if no cookie found, as NextAuth might use a different storage method)
    try {
      const sessionUrl = `${origin}/api/auth/session`;

      const response = await fetch(sessionUrl, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });

      if (!response.ok) {
        console.log('❌ Session API returned error:', response.status);
        return NextResponse.redirect(new URL('/', request.url));
      }

      const session = await response.json();

      console.log('Session data:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        userRole: session?.user?.role,
      });

      if (!session?.user) {
        console.log('❌ No user in session, redirecting to homepage');
        return NextResponse.redirect(new URL('/', request.url));
      }

      if (session.user.role !== 'admin') {
        console.log('❌ User role is not admin:', session.user.role, 'redirecting to homepage');
        return NextResponse.redirect(new URL('/', request.url));
      }

      console.log('✅ Admin access granted');
    } catch (error) {
      console.error('Error checking session:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  if (isLockBypassed(path)) {
    return NextResponse.next();
  }

  const origin = getRequestOrigin(request);
  const locked = await isSiteLocked(origin);
  if (locked) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/data|favicon.ico|icon.png|Icon.png|logo.svg|robots.txt|sitemap.xml|uploads).*)',
  ],
};
