import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect admin routes
  if (path.startsWith('/admin')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    console.log('🔐 Admin access attempt:', {
      path,
      hasToken: !!token,
      tokenEmail: token?.email,
      tokenRole: token?.role,
      tokenId: token?.id
    });

    if (!token) {
      console.log('❌ No token found, redirecting to homepage');
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (token.role !== 'admin') {
      console.log('❌ User role is not admin:', token.role, 'redirecting to homepage');
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.log('✅ Admin access granted');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
