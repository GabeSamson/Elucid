import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users with order statistics
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        orders: {
          select: {
            total: true,
          },
        },
      },
    });

    // Calculate stats for each user
    const usersWithStats = users.map(user => {
      const orderCount = user.orders.length;
      const totalSpent = user.orders.reduce((sum, order) => sum + order.total, 0);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        orderCount,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
      };
    });

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
