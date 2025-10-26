import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type ProfitBucketKey = 'day' | 'week' | 'month' | 'year' | 'lifetime';

interface ProfitAccumulator {
  revenue: number;
  cost: number;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfDay);
    // Align to Monday as start of week
    const dayOfWeek = startOfWeek.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = (dayOfWeek + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const periods: Record<ProfitBucketKey, { start: Date | null } & ProfitAccumulator> = {
      day: { start: startOfDay, revenue: 0, cost: 0 },
      week: { start: startOfWeek, revenue: 0, cost: 0 },
      month: { start: startOfMonth, revenue: 0, cost: 0 },
      year: { start: startOfYear, revenue: 0, cost: 0 },
      lifetime: { start: null, revenue: 0, cost: 0 },
    };

    const orders = await prisma.order.findMany({
      where: {
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    orders.forEach((order) => {
      const createdAt = order.createdAt;
      const revenue = order.total;
      const cost = order.items.reduce((sum, item) => {
        const costPrice = item.product?.costPrice ?? 0;
        return sum + costPrice * item.quantity;
      }, 0);

      (Object.keys(periods) as ProfitBucketKey[]).forEach((key) => {
        const { start } = periods[key];
        if (start && createdAt < start) {
          return;
        }
        periods[key].revenue += revenue;
        periods[key].cost += cost;
      });
    });

    const formatted = (Object.keys(periods) as ProfitBucketKey[]).reduce(
      (acc, key) => {
        const { revenue, cost } = periods[key];
        acc[key] = {
          revenue: Number(revenue.toFixed(2)),
          cost: Number(cost.toFixed(2)),
          profit: Number((revenue - cost).toFixed(2)),
        };
        return acc;
      },
      {} as Record<ProfitBucketKey, { revenue: number; cost: number; profit: number }>
    );

    return NextResponse.json({ periods: formatted });
  } catch (error) {
    console.error('Error calculating order profits:', error);
    return NextResponse.json({ error: 'Failed to calculate profits' }, { status: 500 });
  }
}
