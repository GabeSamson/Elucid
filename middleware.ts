import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  console.log('🔐 Admin access attempt:', {
    path,
    isLoggedIn,
    userEmail: req.auth?.user?.email,
    userRole,
    userId: req.auth?.user?.id
  });

  // Protect admin routes
  if (path.startsWith('/admin')) {
    if (!isLoggedIn) {
      console.log('❌ Not logged in, redirecting to homepage');
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (userRole !== 'admin') {
      console.log('❌ User role is not admin:', userRole, 'redirecting to homepage');
      return NextResponse.redirect(new URL('/', req.url));
    }

    console.log('✅ Admin access granted');
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
