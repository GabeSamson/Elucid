import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam) : 30; // Default to last 30 days

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get total page views
    const totalViews = await prisma.pageView.count({
      where: {
        createdAt: { gte: dateFrom },
      },
    });

    // Get unique page views by path
    const viewsByPath = await prisma.pageView.groupBy({
      by: ["path"],
      where: {
        createdAt: { gte: dateFrom },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    // Get referrer statistics
    const viewsByReferrer = await prisma.pageView.groupBy({
      by: ["referrer"],
      where: {
        createdAt: { gte: dateFrom },
        referrer: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    // Get UTM source statistics
    const viewsByUtmSource = await prisma.pageView.groupBy({
      by: ["utmSource"],
      where: {
        createdAt: { gte: dateFrom },
        utmSource: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    // Get country statistics
    const viewsByCountry = await prisma.pageView.groupBy({
      by: ["country"],
      where: {
        createdAt: { gte: dateFrom },
        country: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    // Get daily views for time series chart
    const dailyViews = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM page_views
      WHERE created_at >= ${dateFrom}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Convert BigInt to number for JSON serialization
    const dailyViewsFormatted = dailyViews.map((dv) => ({
      date: dv.date.toISOString().split("T")[0],
      count: Number(dv.count),
    }));

    return NextResponse.json({
      totalViews,
      viewsByPath: viewsByPath.map((v) => ({
        path: v.path,
        count: v._count.id,
      })),
      viewsByReferrer: viewsByReferrer.map((v) => ({
        referrer: v.referrer,
        count: v._count.id,
      })),
      viewsByUtmSource: viewsByUtmSource.map((v) => ({
        utmSource: v.utmSource,
        count: v._count.id,
      })),
      viewsByCountry: viewsByCountry.map((v) => ({
        country: v.country,
        count: v._count.id,
      })),
      dailyViews: dailyViewsFormatted,
    });
  } catch (error) {
    console.error("Error fetching analytics stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics stats" },
      { status: 500 }
    );
  }
}
