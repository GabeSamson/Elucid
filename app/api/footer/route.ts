import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = session?.user?.role === 'admin';

    // Fetch footer tagline from database
    const homepageConfig = await prisma.homepageConfig.findUnique({
      where: { id: 'main' },
      select: { footerTagline: true },
    });

    const footerTagline = homepageConfig?.footerTagline || 'Made in London';

    return NextResponse.json({
      footerTagline,
      isAdmin,
    });
  } catch (error) {
    console.error('Error fetching footer data:', error);
    return NextResponse.json(
      { footerTagline: 'Made in London', isAdmin: false },
      { status: 200 }
    );
  }
}
