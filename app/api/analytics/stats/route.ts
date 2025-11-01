import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

    if (!user?.role || user.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam) : 30; // Default to last 30 days

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const previousPeriodStart = new Date(dateFrom);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    const whereClause = {
      createdAt: { gte: dateFrom },
    };
    const previousWhereClause = {
      createdAt: {
        gte: previousPeriodStart,
        lt: dateFrom,
      },
    };

    const orderWhereClause = {
      createdAt: { gte: dateFrom },
      status: { not: "CANCELLED" },
    };
    const previousOrderWhereClause = {
      createdAt: {
        gte: previousPeriodStart,
        lt: dateFrom,
      },
      status: { not: "CANCELLED" },
    };

    const [
      totalViews,
      uniqueVisitors,
      latestView,
      viewsByPath,
      viewsByReferrer,
      viewsByUtmSource,
      viewsByCountry,
      dailyViewsRaw,
      classifiedViews,
      sessionStatsRaw,
      ordersSummary,
      ordersByDayRaw,
      ordersForCustomers,
      previousViewsCount,
      previousUniqueCount,
      previousOrdersCount,
      previousSessionsCount,
    ] = await Promise.all([
      prisma.pageView.count({ where: whereClause }),
      prisma.pageView.count({
        where: whereClause,
        distinct: [Prisma.PageViewScalarFieldEnum.visitorHash],
      }),
      prisma.pageView.findFirst({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.pageView.groupBy({
        by: ["path"],
        where: whereClause,
        _count: { id: true },
        orderBy: {
          _count: { id: "desc" },
        },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: {
          ...whereClause,
          referrer: { not: null },
        },
        _count: { id: true },
        orderBy: {
          _count: { id: "desc" },
        },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["utmSource"],
        where: {
          ...whereClause,
          utmSource: { not: null },
        },
        _count: { id: true },
        orderBy: {
          _count: { id: "desc" },
        },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["country"],
        where: {
          ...whereClause,
          country: { not: null },
        },
        _count: { id: true },
        orderBy: {
          _count: { id: "desc" },
        },
        take: 10,
      }),
      prisma.$queryRaw<
        Array<{ date: Date; total: bigint; unique_count: bigint; session_count: bigint }>
      >`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as total,
          COUNT(DISTINCT visitor_hash) as unique_count,
          COUNT(DISTINCT session_hash) as session_count
        FROM page_views
        WHERE created_at >= ${dateFrom}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.pageView.findMany({
        where: whereClause,
        select: {
          referrer: true,
          utmSource: true,
          visitorHash: true,
          createdAt: true,
        },
      }),
      prisma.$queryRaw<
        Array<{
          session_hash: string | null;
          first_seen: Date;
          last_seen: Date;
          events: bigint;
        }>
      >`
        SELECT
          session_hash,
          MIN(created_at) AS first_seen,
          MAX(created_at) AS last_seen,
          COUNT(*) AS events
        FROM page_views
        WHERE created_at >= ${dateFrom}
          AND session_hash IS NOT NULL
        GROUP BY session_hash
      `,
      prisma.order.aggregate({
        where: orderWhereClause,
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.$queryRaw<
        Array<{ date: Date; orders: bigint; revenue: number }>
      >`
        SELECT
          DATE(created_at) AS date,
          COUNT(*) AS orders,
          COALESCE(SUM(total), 0) AS revenue
        FROM orders
        WHERE created_at >= ${dateFrom}
          AND status != 'CANCELLED'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.order.findMany({
        where: orderWhereClause,
        select: {
          id: true,
          userId: true,
          email: true,
        },
      }),
      prisma.pageView.count({ where: previousWhereClause }),
      prisma.pageView.count({
        where: previousWhereClause,
        distinct: [Prisma.PageViewScalarFieldEnum.visitorHash],
      }),
      prisma.order.count({ where: previousOrderWhereClause }),
      prisma.pageView.count({
        where: previousWhereClause,
        distinct: [Prisma.PageViewScalarFieldEnum.sessionHash],
      }),
    ]);

    type SourceKey = "Direct" | "Social" | "Search" | "Referral" | "Campaign";
    const SOURCE_KEYS: SourceKey[] = [
      "Direct",
      "Social",
      "Search",
      "Referral",
      "Campaign",
    ];

    const SOCIAL_DOMAINS = [
      "instagram.com",
      "facebook.com",
      "tiktok.com",
      "twitter.com",
      "x.com",
      "youtube.com",
      "linkedin.com",
      "pinterest.com",
      "snapchat.com",
      "threads.net",
      "reddit.com",
    ];
    const SEARCH_DOMAINS = [
      "google.",
      "bing.",
      "yahoo.",
      "duckduckgo.",
      "ecosia.",
      "yandex.",
      "baidu.",
      "ask.com",
    ];

    const hostFromUrl = (ref: string | null | undefined): string | null => {
      if (!ref) return null;
      try {
        const value = ref.startsWith("http") ? ref : `https://${ref}`;
        const host = new URL(value).hostname.toLowerCase();
        return host.startsWith("www.") ? host.slice(4) : host;
      } catch {
        const sanitized = ref
          .replace(/^https?:\/\//, "")
          .split("/")[0]
          .toLowerCase();
        if (!sanitized) return null;
        return sanitized.startsWith("www.") ? sanitized.slice(4) : sanitized;
      }
    };

    const matchesDomain = (host: string, domain: string) =>
      host === domain || host.endsWith(`.${domain}`);

    const siteHost = (() => {
      try {
        if (!process.env.NEXT_PUBLIC_APP_URL) return null;
        const host = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.toLowerCase();
        return host.startsWith("www.") ? host.slice(4) : host;
      } catch {
        return null;
      }
    })();

    const classifySource = (
      referrer: string | null | undefined,
      utmSource: string | null | undefined
    ): SourceKey => {
      if (utmSource) {
        return "Campaign";
      }

      const host = hostFromUrl(referrer);
      if (!host) {
        return "Direct";
      }

      if (siteHost && matchesDomain(host, siteHost)) {
        return "Direct";
      }

      if (SOCIAL_DOMAINS.some((domain) => matchesDomain(host, domain))) {
        return "Social";
      }

      if (SEARCH_DOMAINS.some((domain) => host.includes(domain))) {
        return "Search";
      }

      return "Referral";
    };

    const sourceTotals = new Map<
      SourceKey,
      { views: number; uniqueVisitors: Set<string> }
    >();
    SOURCE_KEYS.forEach((key) =>
      sourceTotals.set(key, { views: 0, uniqueVisitors: new Set() })
    );

    const timeline = new Map<
      string,
      Record<SourceKey, number>
    >();

    const socialReferrersMap = new Map<string, number>();
    const searchReferrersMap = new Map<string, number>();

    classifiedViews.forEach((view) => {
      const source = classifySource(view.referrer, view.utmSource);
      const totals = sourceTotals.get(source);
      if (totals) {
        totals.views += 1;
        if (view.visitorHash) {
          totals.uniqueVisitors.add(view.visitorHash);
        }
      }

      const dateKey = view.createdAt.toISOString().split("T")[0];
      if (!timeline.has(dateKey)) {
        timeline.set(dateKey, {
          Direct: 0,
          Social: 0,
          Search: 0,
          Referral: 0,
          Campaign: 0,
        });
      }
      const dayRecord = timeline.get(dateKey);
      if (dayRecord) {
        dayRecord[source] = (dayRecord[source] || 0) + 1;
      }

      if (source === "Social" || source === "Search") {
        const host = hostFromUrl(view.referrer);
        if (host) {
          if (source === "Social") {
            socialReferrersMap.set(host, (socialReferrersMap.get(host) || 0) + 1);
          } else {
            searchReferrersMap.set(host, (searchReferrersMap.get(host) || 0) + 1);
          }
        }
      }
    });

    const sourceBreakdown = SOURCE_KEYS.map((key) => {
      const totals = sourceTotals.get(key)!;
      const views = totals.views;
      const unique = totals.uniqueVisitors.size;
      return {
        source: key,
        views,
        uniqueVisitors: unique,
        percentage:
          totalViews > 0 ? Number(((views / totalViews) * 100).toFixed(1)) : 0,
      };
    }).sort((a, b) => b.views - a.views);

    const sourceTimeline = Array.from(timeline.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => ({
        date,
        Direct: counts.Direct || 0,
        Social: counts.Social || 0,
        Search: counts.Search || 0,
        Referral: counts.Referral || 0,
        Campaign: counts.Campaign || 0,
      }));

    const ordersByDayMap = ordersByDayRaw.reduce<
      Record<
        string,
        {
          orders: number;
          revenue: number;
        }
      >
    >((acc, entry) => {
      const key = entry.date.toISOString().split("T")[0];
      acc[key] = {
        orders: Number(entry.orders),
        revenue: Number(entry.revenue),
      };
      return acc;
    }, {});

    const dailyViews = dailyViewsRaw.map((dv) => {
      const dateKey = dv.date.toISOString().split("T")[0];
      const dayOrders = ordersByDayMap[dateKey]?.orders ?? 0;
      const dayRevenue = ordersByDayMap[dateKey]?.revenue ?? 0;
      const unique = Number(dv.unique_count);

      return {
        date: dateKey,
        pageViews: Number(dv.total),
        sessions: Number(dv.session_count),
        uniqueVisitors: unique,
        orders: dayOrders,
        conversionRate:
          Number(dv.session_count) > 0
            ? Number(((dayOrders / Number(dv.session_count)) * 100).toFixed(1))
            : 0,
        revenue: Number(dayRevenue.toFixed(2)),
      };
    });

    const topSocialReferrers = Array.from(socialReferrersMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSearchReferrers = Array.from(searchReferrersMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const sessionStats = sessionStatsRaw
      .map((session) => {
        const durationMs = Math.max(
          session.last_seen.getTime() - session.first_seen.getTime(),
          0
        );
        return {
          durationMs,
          events: Number(session.events),
        };
      })
      .filter((session) => Number.isFinite(session.durationMs));

    const totalSessions = sessionStats.length;
    const totalSessionDuration = sessionStats.reduce(
      (sum, session) => sum + session.durationMs,
      0
    );
    const totalSessionEvents = sessionStats.reduce(
      (sum, session) => sum + session.events,
      0
    );

    const averageSessionDuration =
      totalSessions > 0 ? totalSessionDuration / totalSessions : 0;
    const averagePagesPerSession =
      totalSessions > 0 ? totalSessionEvents / totalSessions : 0;

    const sortedDurations = sessionStats
      .map((session) => session.durationMs)
      .sort((a, b) => a - b);

    const medianSessionDuration = (() => {
      if (sortedDurations.length === 0) return 0;
      const mid = Math.floor(sortedDurations.length / 2);
      if (sortedDurations.length % 2 === 0) {
        return (sortedDurations[mid - 1] + sortedDurations[mid]) / 2;
      }
      return sortedDurations[mid];
    })();

    const ordersCount = ordersSummary._count._all || 0;
    const ordersRevenue = Number(ordersSummary._sum.total || 0);
    const averageOrderValue =
      ordersCount > 0 ? ordersRevenue / ordersCount : 0;
    const conversionRate =
      totalSessions > 0
        ? Number(((ordersCount / totalSessions) * 100).toFixed(2))
        : 0;

    const uniqueCustomerSet = new Set<string>();
    ordersForCustomers.forEach((order) => {
      if (order.userId) {
        uniqueCustomerSet.add(`user:${order.userId}`);
      } else if (order.email) {
        uniqueCustomerSet.add(`email:${order.email.toLowerCase()}`);
      } else {
        uniqueCustomerSet.add(`order:${order.id}`);
      }
    });

    const uniqueCustomers = uniqueCustomerSet.size;
    const ordersPerVisit = totalSessions > 0 ? Number((ordersCount / totalSessions).toFixed(2)) : 0;
    const ordersPerCustomer = uniqueCustomers > 0 ? Number((ordersCount / uniqueCustomers).toFixed(2)) : 0;
    const sessionsPerVisitor = uniqueVisitors > 0 ? Number((totalSessions / uniqueVisitors).toFixed(2)) : 0;

    const trend = {
      viewsChange:
        previousViewsCount > 0
          ? Number(
              (((totalViews - previousViewsCount) / previousViewsCount) * 100).toFixed(
                1
              )
            )
          : null,
      uniqueChange:
        previousUniqueCount > 0
          ? Number(
              (
                ((uniqueVisitors - previousUniqueCount) / previousUniqueCount) *
                100
              ).toFixed(1)
            )
          : null,
      ordersChange:
        previousOrdersCount > 0
          ? Number(
              (
                ((ordersCount - previousOrdersCount) / previousOrdersCount) *
                100
              ).toFixed(1)
            )
          : null,
      sessionsChange:
        previousSessionsCount > 0
          ? Number(
              (
                ((totalSessions - previousSessionsCount) / previousSessionsCount) *
                100
              ).toFixed(1)
            )
          : null,
    };

    return NextResponse.json({
      totalViews,
      uniqueVisitors,
      lastViewAt: latestView?.createdAt
        ? latestView.createdAt.toISOString()
        : null,
      totalSessions,
      averageSessionDuration,
      medianSessionDuration,
      averagePagesPerSession,
      sessionsPerVisitor,
      conversion: {
        orders: ordersCount,
        revenue: Number(ordersRevenue.toFixed(2)),
        conversionRate,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        ordersPerVisit,
        ordersPerCustomer,
        uniqueCustomers,
      },
      trend,
      sourceBreakdown,
      sourceTimeline,
      socialReferrers: topSocialReferrers,
      searchReferrers: topSearchReferrers,
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
      dailyViews,
    });
  } catch (error) {
    console.error("Error fetching analytics stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics stats" },
      { status: 500 }
    );
  }
}
