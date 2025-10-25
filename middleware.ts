import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect admin routes
  if (path.startsWith('/admin')) {
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
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host');
      const sessionUrl = `${protocol}://${host}/api/auth/session`;

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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
