import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only fetch verified subscribers
    const subscribers = await prisma.newsletter.findMany({
      where: { verified: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error('Newsletter fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter subscribers' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await prisma.newsletter.delete({
      where: { email },
    });

    return NextResponse.json({ message: 'Subscriber removed successfully' });
  } catch (error) {
    console.error('Newsletter delete error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscriber' },
      { status: 500 }
    );
  }
}
