import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user to check if they're the last admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Last admin protection
    if (user.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });

      if (adminCount === 1) {
        return NextResponse.json(
          { error: 'Cannot delete your account as you are the last admin. Promote another user first.' },
          { status: 400 }
        );
      }
    }

    // Delete user account (orders will be orphaned but kept for records)
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Self-deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
