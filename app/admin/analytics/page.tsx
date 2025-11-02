'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { formatCurrency, getActiveCurrency } from '@/lib/currency';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  filteredProduct?: { id: string; name: string } | null;
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    totalOrders: number;
    averageOrderValue: number;
    uniqueCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    inventoryValue: number;
  };
  revenueChart: Array<{ date: string; revenue: number; orders: number }>;
  ordersByStatus: { [key: string]: number };
  bestSellers: Array<{ id: string; name: string; quantity: number; revenue: number; cost: number; profit: number; profitMargin: number }>;
  colorPerformance: Array<{ color: string; quantity: number; revenue: number; orders: number }>;
  sizePerformance: Array<{ size: string; quantity: number; revenue: number; orders: number }>;
  lowStockProducts: Array<{
    id: string;
    productName: string;
    size: string;
    color: string;
    stock: number;
    price: number;
  }>;
  locations: Array<{ country: string; count: number; revenue: number }>;
}

type TrafficSourceKey = 'Direct' | 'Social' | 'Search' | 'Referral' | 'Campaign';

interface TrafficSourceBreakdown {
  source: TrafficSourceKey;
  views: number;
  uniqueVisitors: number;
  percentage: number;
}

interface TrafficTimelinePoint {
  date: string;
  Direct: number;
  Social: number;
  Search: number;
  Referral: number;
  Campaign: number;
}

interface TrafficAnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  lastViewAt: string | null;
  totalSessions: number;
  averageSessionDuration: number;
  medianSessionDuration: number;
  averagePagesPerSession: number;
  sessionsPerVisitor: number;
  conversion: {
    orders: number;
    revenue: number;
    conversionRate: number;
    averageOrderValue: number;
    ordersPerVisit: number;
    ordersPerCustomer: number;
    uniqueCustomers: number;
  };
  trend: {
    viewsChange: number | null;
    uniqueChange: number | null;
    ordersChange: number | null;
    sessionsChange: number | null;
  };
  sourceBreakdown: TrafficSourceBreakdown[];
  sourceTimeline: TrafficTimelinePoint[];
  socialReferrers: Array<{ referrer: string; count: number }>;
  searchReferrers: Array<{ referrer: string; count: number }>;
  viewsByPath: Array<{ path: string; count: number }>;
  viewsByReferrer: Array<{ referrer: string | null; count: number }>;
  viewsByUtmSource: Array<{ utmSource: string | null; count: number }>;
  viewsByCountry: Array<{ country: string | null; count: number }>;
  dailyViews: Array<{
    date: string;
    pageViews: number;
    sessions: number;
    uniqueVisitors: number;
    orders: number;
    conversionRate: number;
    revenue: number;
  }>;
}

const TRAFFIC_SOURCE_COLORS: Record<TrafficSourceKey, string> = {
  Direct: '#2B2826',
  Social: '#7C3AED',
  Search: '#10B981',
  Referral: '#F59E0B',
  Campaign: '#F97316',
};

const TRAFFIC_SOURCE_ORDER: TrafficSourceKey[] = [
  'Direct',
  'Social',
  'Search',
  'Referral',
  'Campaign',
];

type TrendTone = 'up' | 'down' | 'neutral';

interface TrendInfo {
  label: string;
  tone: TrendTone;
}

const STATUS_COLORS: { [key: string]: string } = {
  PENDING: '#fbbf24',
  PROCESSING: '#60a5fa',
  SHIPPED: '#34d399',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
};

function AdminAnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get('product');

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [trafficData, setTrafficData] = useState<TrafficAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const activeCurrency = getActiveCurrency();

  const sumCounts = (items?: Array<{ count: number }>) =>
    Array.isArray(items) ? items.reduce((sum, item) => sum + item.count, 0) : 0;

  const formatRelativeTime = (timestamp: string | null | undefined) => {
    if (!timestamp) {
      return 'No visits yet';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }

    const diffMs = Date.now() - date.getTime();
    if (diffMs <= 0) {
      return 'Just now';
    }

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  };

  const formatDuration = (milliseconds: number) => {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
      return '0m 00s';
    }

    const totalSeconds = Math.round(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }

    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const formatTrend = (value: number | null | undefined): TrendInfo => {
    if (value === null || value === undefined) {
      return { label: 'No prior data', tone: 'neutral' };
    }
    if (!Number.isFinite(value)) {
      return { label: 'No prior data', tone: 'neutral' };
    }

    const tone: TrendTone = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
    const symbol = value > 0 ? '▲' : value < 0 ? '▼' : '■';
    return {
      label: `${symbol} ${Math.abs(value).toFixed(1)}% vs prior period`,
      tone,
    };
  };

  useEffect(() => {
    fetchAnalytics();
    fetchTrafficAnalytics();
  }, [timeRange, productId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(timeRange) });
      if (productId) {
        params.set('product', productId);
      }
      const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
        cache: 'no-store',
      });
      const analyticsData = await res.json();
      if (res.ok) {
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrafficAnalytics = async () => {
    setTrafficLoading(true);
    try {
      const params = new URLSearchParams({ days: String(timeRange) });
      const res = await fetch(`/api/analytics/stats?${params.toString()}`, {
        cache: 'no-store',
      });
      const trafficAnalyticsData = await res.json();
      if (res.ok) {
        setTrafficData(trafficAnalyticsData);
      }
    } catch (error) {
      console.error('Error fetching traffic analytics:', error);
    } finally {
      setTrafficLoading(false);
    }
  };

  const clearFilter = () => {
    router.push('/admin/analytics');
  };

  const handleResetStatistics = async () => {
    setResetStatus(null);
    const confirmations = [
      'This will permanently delete all order history and analytics data. Are you absolutely sure? (1/5)',
      'This action cannot be undone. Proceed with resetting statistics? (2/5)',
      'Please confirm once more to reset all statistics. (3/5)',
      'Final warning: All orders and stats will be removed. Continue? (4/5)',
      'Last confirmation! Do you really want to reset statistics? (5/5)',
    ];

    for (const prompt of confirmations) {
      const confirmed = window.confirm(prompt);
      if (!confirmed) {
        setResetStatus({ type: 'error', message: 'Statistics reset cancelled.' });
        return;
      }
    }

    setResetting(true);

    try {
      const res = await fetch('/api/admin/statistics/reset', { method: 'POST' });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to reset statistics');
      }

      setResetStatus({ type: 'success', message: 'Statistics reset successfully.' });
      await fetchAnalytics();
    } catch (error: any) {
      setResetStatus({ type: 'error', message: error.message || 'Failed to reset statistics' });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-charcoal/60 text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-charcoal/60">No data available</div>
      </div>
    );
  }

  const topLocations = data.locations.slice(0, 6);

  // Prepare order status data for pie chart
  const statusData = Object.entries(data.ordersByStatus).map(([status, count]) => ({
    name: status.charAt(0) + status.slice(1).toLowerCase(),
    value: count,
    color: STATUS_COLORS[status] || '#6b7280',
  }));

  const topTrafficSource = trafficData?.sourceBreakdown?.find((entry) => entry.views > 0);
  const directTrafficSource = trafficData?.sourceBreakdown?.find((entry) => entry.source === 'Direct');
  const totalSocialVisits = sumCounts(trafficData?.socialReferrers);
  const totalSearchVisits = sumCounts(trafficData?.searchReferrers);
  const totalCampaignVisits = sumCounts(trafficData?.viewsByUtmSource);
  const channelBarHeight = Math.max(((trafficData?.sourceBreakdown?.length || 0) + 1) * 44, 240);
  const sessionsTrend = formatTrend(trafficData?.trend?.sessionsChange);
  const viewsTrend = formatTrend(trafficData?.trend?.viewsChange);
  const uniqueTrend = formatTrend(trafficData?.trend?.uniqueChange);
  const ordersTrend = formatTrend(trafficData?.trend?.ordersChange);
  const trendClass = (tone: TrendTone) => {
    if (tone === 'up') return 'text-emerald-600';
    if (tone === 'down') return 'text-red-500';
    return 'text-charcoal/60';
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-charcoal-dark to-charcoal p-8 -mx-8 -mt-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl text-cream mb-2">Analytics & Insights</h1>
            <p className="text-cream/70 text-sm">Track your store's performance and key metrics</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Time Range Selector */}
            <div className="relative">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="w-full px-4 py-2 pr-10 bg-cream border border-cream/20 focus:border-cream focus:outline-none rounded appearance-none cursor-pointer text-charcoal"
              >
                <option value={1}>Today</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 365 days</option>
                <option value={9999999}>Lifetime</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/60">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Filter Banner */}
      {data?.filteredProduct && (
        <div className="bg-beige/20 border border-beige px-4 py-3 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-sm text-charcoal-dark">
              Filtered by product: <strong>{data.filteredProduct.name}</strong>
            </span>
          </div>
          <button
            onClick={clearFilter}
            className="text-xs text-charcoal hover:text-charcoal-dark underline"
          >
            Clear Filter
          </button>
        </div>
      )}

      {resetStatus && (
        <div
          className={`border px-4 py-3 text-sm ${
            resetStatus.type === 'success'
              ? 'bg-beige/20 border-beige text-charcoal-dark'
              : 'bg-cream-dark border-charcoal/30 text-charcoal-dark'
          }`}
        >
          {resetStatus.message}
        </div>
      )}

      {/* Key Metrics Section */}
      <section>
        <div className="mb-6">
          <h2 className="font-serif text-3xl text-charcoal-dark mb-2">Key Metrics</h2>
          <p className="text-charcoal/60 text-sm">Overview of your store's financial and operational performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-cream p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Total Revenue</div>
            <div className="text-3xl font-serif text-charcoal">
              {formatCurrency(data.summary.totalRevenue)}
            </div>
          </div>

          <div className="bg-beige/20 p-6 rounded-lg border border-beige shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Total Profit</div>
            <div className="text-3xl font-serif text-charcoal-dark">
              {formatCurrency(data.summary.totalProfit)}
            </div>
            <div className="text-xs text-charcoal mt-2 font-medium">
              {data.summary.profitMargin}% margin
            </div>
          </div>

          <div className="bg-cream p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Total Cost</div>
            <div className="text-3xl font-serif text-charcoal">
              {formatCurrency(data.summary.totalCost)}
            </div>
          </div>

          <div className="bg-cream p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Total Orders</div>
            <div className="text-3xl font-serif text-charcoal">
              {data.summary.totalOrders}
            </div>
          </div>

          <div className="bg-cream p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Avg Order Value</div>
            <div className="text-3xl font-serif text-charcoal">
              {formatCurrency(data.summary.averageOrderValue)}
            </div>
          </div>

          <div className="bg-cream p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Unique Customers</div>
            <div className="text-3xl font-serif text-charcoal">
              {data.summary.uniqueCustomers}
            </div>
          </div>

          <div className="bg-beige/20 p-6 rounded-lg border border-beige shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">New Customers</div>
            <div className="text-3xl font-serif text-charcoal-dark">
              {data.summary.newCustomers}
            </div>
          </div>

          <div className="bg-beige/30 p-6 rounded-lg border border-beige shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Returning</div>
            <div className="text-3xl font-serif text-charcoal-dark">
              {data.summary.returningCustomers}
            </div>
          </div>

          <div className="bg-cream-dark p-6 rounded-lg border border-beige md:col-span-2 lg:col-span-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Total Inventory Value</div>
            <div className="text-3xl font-serif text-charcoal-dark">
              {formatCurrency(data.summary.inventoryValue)}
            </div>
          </div>
        </div>
      </section>

      {/* Traffic Analytics Section */}
      <section>
        <div className="mb-6">
          <h2 className="font-serif text-3xl text-charcoal-dark mb-2">Traffic Analytics</h2>
          <p className="text-charcoal/60 text-sm">Monitor site traffic, referrers, and visitor behavior</p>
        </div>

        {trafficLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-charcoal/60 text-lg">Loading traffic data...</div>
          </div>
        ) : (
          <>
            {/* Show info banner if no traffic data */}
            {(!trafficData || trafficData.totalViews === 0) && (
              <div className="bg-beige/10 border border-beige p-4 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-charcoal-dark mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-charcoal-dark">Traffic Tracking Active</p>
                    <p className="text-xs text-charcoal/70 mt-1">
                      Analytics are being collected automatically. Data will appear here once visitors start browsing your site.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Traffic Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Site Visits</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData?.totalSessions?.toLocaleString() || 0}
                </div>
                {sessionsTrend && (
                  <div className={`text-xs font-medium mt-2 ${trendClass(sessionsTrend.tone)}`}>
                    {sessionsTrend.label}
                  </div>
                )}
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Unique Visitors</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData?.uniqueVisitors?.toLocaleString() || 0}
                </div>
                {uniqueTrend && (
                  <div className={`text-xs font-medium mt-2 ${trendClass(uniqueTrend.tone)}`}>
                    {uniqueTrend.label}
                  </div>
                )}
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Conversion Rate</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData ? `${trafficData.conversion.conversionRate.toFixed(2)}%` : '0.00%'}
                </div>
                <div className="text-xs text-charcoal/70 mt-2 font-medium">
                  {trafficData?.conversion?.orders?.toLocaleString() || 0} orders
                </div>
                {ordersTrend && (
                  <div className={`text-xs font-medium mt-1 ${trendClass(ordersTrend.tone)}`}>
                    {ordersTrend.label}
                  </div>
                )}
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Latest Visit</div>
                <div className="text-2xl font-serif text-charcoal-dark">
                  {formatRelativeTime(trafficData?.lastViewAt)}
                </div>
                {trafficData?.lastViewAt && (
                  <div className="text-xs text-charcoal/70 mt-1">
                    {new Date(trafficData.lastViewAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>

            {topTrafficSource && (
              <p className="mb-6 text-xs uppercase tracking-wider text-charcoal/60">
                Leading channel: <span className="text-charcoal-dark font-medium">{topTrafficSource.source}</span> · {topTrafficSource.views.toLocaleString()} visits ({topTrafficSource.percentage}%)
              </p>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md">
                <h3 className="font-serif text-xl text-charcoal mb-6">Channel Mix Over Time</h3>
                {trafficData?.sourceTimeline && trafficData.sourceTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={trafficData.sourceTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2DCD0" />
                      <XAxis
                        dataKey="date"
                        stroke="#2B2826"
                        tick={{ fill: '#6B6560' }}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
                        }
                      />
                      <YAxis
                        stroke="#2B2826"
                        tick={{ fill: '#6B6560' }}
                        tickFormatter={(value) => Number(value).toLocaleString()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#F5F3EE',
                          border: '1px solid #D4C9BA',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        }
                        formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                      />
                      <Legend />
                      {TRAFFIC_SOURCE_ORDER.map((source) => (
                        <Area
                          key={source}
                          type="monotone"
                          dataKey={source}
                          stackId="1"
                          stroke={TRAFFIC_SOURCE_COLORS[source]}
                          fill={TRAFFIC_SOURCE_COLORS[source]}
                          fillOpacity={0.24}
                          name={source}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-charcoal/60 text-center py-12">
                    No channel data for this period
                  </div>
                )}
              </div>

              <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md">
                <h3 className="font-serif text-xl text-charcoal mb-6">Traffic by Channel</h3>
                {trafficData?.sourceBreakdown && trafficData.sourceBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={channelBarHeight}>
                    <BarChart
                      data={trafficData.sourceBreakdown}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 60, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2DCD0" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="#2B2826"
                        tick={{ fill: '#6B6560' }}
                        tickFormatter={(value) => Number(value).toLocaleString()}
                      />
                      <YAxis
                        dataKey="source"
                        type="category"
                        stroke="#2B2826"
                        tick={{ fill: '#6B6560' }}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#F5F3EE',
                          border: '1px solid #D4C9BA',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, _name: string, entry: any) => {
                          const unique = entry?.payload?.uniqueVisitors ?? 0;
                          return [
                            `${Number(value).toLocaleString()} visits`,
                            `${entry?.payload?.source || 'Channel'} • ${unique.toLocaleString()} unique`,
                          ];
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="views"
                        name="Visits"
                        radius={[4, 4, 4, 4]}
                      >
                        {trafficData.sourceBreakdown.map((entry, index) => (
                          <Cell
                            key={`channel-cell-${entry.source}-${index}`}
                            fill={TRAFFIC_SOURCE_COLORS[entry.source]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-charcoal/60 text-center py-12">
                    No channel breakdown available
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Page Views</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData?.totalViews?.toLocaleString() || 0}
                </div>
                {viewsTrend && (
                  <div className={`text-xs font-medium mt-2 ${trendClass(viewsTrend.tone)}`}>
                    {viewsTrend.label}
                  </div>
                )}
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Pages per Visit</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData ? trafficData.averagePagesPerSession.toFixed(1) : '0.0'}
                </div>
                <div className="text-xs text-charcoal/70 mt-2 font-medium">
                  Avg session length {trafficData ? formatDuration(trafficData.averageSessionDuration) : '0m 00s'}
                </div>
                <div className="text-xs text-charcoal/60 mt-1">
                  Median session {trafficData ? formatDuration(trafficData.medianSessionDuration) : '0m 00s'}
                </div>
                <div className="text-xs text-charcoal/60 mt-1">
                  {trafficData ? trafficData.sessionsPerVisitor.toFixed(2) : '0.00'} sessions / visitor
                </div>
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Orders per Visit</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData ? trafficData.conversion.ordersPerVisit.toFixed(2) : '0.00'}
                </div>
                <div className="text-xs text-charcoal/70 mt-2 font-medium">
                  {trafficData?.conversion?.orders?.toLocaleString() || 0} orders in range
                </div>
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Unique Customers</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData?.conversion?.uniqueCustomers?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-charcoal/70 mt-2 font-medium">
                  {trafficData ? `${trafficData.conversion.ordersPerCustomer.toFixed(2)} orders / customer` : '0.00'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Direct Traffic</div>
                <div className="text-2xl font-serif text-charcoal-dark">
                  {directTrafficSource ? directTrafficSource.views.toLocaleString() : 0}
                </div>
                {directTrafficSource ? (
                  <div className="text-xs text-charcoal/70 mt-1">
                    {directTrafficSource.percentage}% of total
                  </div>
                ) : (
                  <div className="text-xs text-charcoal/50 mt-1">No direct visits yet</div>
                )}
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Social Referrers</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData?.socialReferrers?.length || 0}
                </div>
                <div className="text-xs text-charcoal/70 mt-1">
                  {totalSocialVisits || 0} visits
                </div>
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Search Referrers</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData?.searchReferrers?.length || 0}
                </div>
                <div className="text-xs text-charcoal/70 mt-1">
                  {totalSearchVisits || 0} visits
                </div>
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Campaign Sources</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData?.viewsByUtmSource?.length || 0}
                </div>
                <div className="text-xs text-charcoal/70 mt-1">
                  {totalCampaignVisits || 0} visits
                </div>
              </div>
            </div>

            {/* Daily Page Views Chart */}
            <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md mb-8">
              <h3 className="font-serif text-xl text-charcoal mb-6">Site Visits Over Time</h3>
              {trafficData?.dailyViews && trafficData.dailyViews.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trafficData.dailyViews}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D4C9BA" />
                    <XAxis
                      dataKey="date"
                      stroke="#2B2826"
                      tick={{ fill: '#6B6560' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                      stroke="#2B2826"
                      tick={{ fill: '#6B6560' }}
                      tickFormatter={(value) => Number(value).toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F5F3EE',
                        border: '1px solid #D4C9BA',
                        borderRadius: '8px',
                      }}
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }
                      formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke="#2B2826"
                      strokeWidth={2}
                      dot={{ fill: '#2B2826', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Site Visits"
                    />
                    <Line
                      type="monotone"
                      dataKey="pageViews"
                      stroke="#F97316"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      name="Page Views"
                    />
                    <Line
                      type="monotone"
                      dataKey="uniqueVisitors"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      dot={{ fill: '#7C3AED', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Unique Visitors"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-charcoal/60 text-center py-12">No traffic data for this period</div>
              )}
            </div>

            {/* Conversion Performance */}
            <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md mb-8">
              <h3 className="font-serif text-xl text-charcoal mb-6">Conversion Performance</h3>
              {trafficData?.dailyViews && trafficData.dailyViews.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={trafficData.dailyViews}>
                    <CartesianGrid stroke="#E2DCD0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="#2B2826"
                      tick={{ fill: '#6B6560' }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                    />
                    <YAxis
                      yAxisId="orders"
                      stroke="#2B2826"
                      tick={{ fill: '#6B6560' }}
                      tickFormatter={(value) => Number(value).toLocaleString()}
                      label={{ value: 'Orders', angle: -90, position: 'insideLeft', fill: '#6B6560' }}
                    />
                    <YAxis
                      yAxisId="conversion"
                      orientation="right"
                      stroke="#7C3AED"
                      tick={{ fill: '#7C3AED' }}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, (dataMax) => Math.max(Number(dataMax) || 0, 10)]}
                      label={{ value: 'Conversion %', angle: 90, position: 'insideRight', fill: '#7C3AED' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F5F3EE',
                        border: '1px solid #D4C9BA',
                        borderRadius: '8px',
                      }}
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }
                      formatter={(value: number, name: string) => {
                        if (name === 'conversionRate') {
                          return [`${value.toFixed(1)}%`, 'Conversion Rate'];
                        }
                        if (name === 'orders') {
                          return [value.toLocaleString(), 'Orders'];
                        }
                        if (name === 'revenue') {
                          return [formatCurrency(value), 'Revenue'];
                        }
                        if (name === 'Site Visits') {
                          return [value.toLocaleString(), 'Site Visits'];
                        }
                        return [typeof value === 'number' ? value.toLocaleString() : value, name];
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="orders"
                      type="monotone"
                      dataKey="sessions"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.12}
                      name="Site Visits"
                    />
                    <Bar
                      yAxisId="orders"
                      dataKey="orders"
                      name="Orders"
                      fill="#2B2826"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="conversion"
                      type="monotone"
                      dataKey="conversionRate"
                      name="Conversion Rate"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-charcoal/60 text-center py-12">
                  No conversion data for this period
                </div>
              )}
            </div>

            {/* Traffic Breakdown Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Pages */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">Top Pages</h3>
                {trafficData?.viewsByPath && trafficData.viewsByPath.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-charcoal/10">
                          <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Path</th>
                          <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.viewsByPath.map((item, index) => (
                          <tr key={index} className="border-b border-charcoal/10 last:border-0">
                            <td className="py-2 px-4 text-sm text-charcoal font-mono truncate max-w-xs">
                              {item.path}
                            </td>
                            <td className="py-2 px-4 text-sm text-charcoal text-right font-medium">
                              {item.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal/60">No page data available</p>
                )}
              </div>

              {/* Top Referrers */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">Top Referrers</h3>
                {trafficData?.viewsByReferrer && trafficData.viewsByReferrer.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-charcoal/10">
                          <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Source</th>
                          <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.viewsByReferrer.map((item, index) => (
                          <tr key={index} className="border-b border-charcoal/10 last:border-0">
                            <td className="py-2 px-4 text-sm text-charcoal font-mono truncate max-w-xs" title={item.referrer || ''}>
                              {item.referrer || 'Direct'}
                            </td>
                            <td className="py-2 px-4 text-sm text-charcoal text-right font-medium">
                              {item.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal/60">No referrer data available</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Social Sources */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">Top Social Sources</h3>
                {trafficData?.socialReferrers && trafficData.socialReferrers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-charcoal/10">
                          <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Platform</th>
                          <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.socialReferrers.map((item, index) => (
                          <tr key={index} className="border-b border-charcoal/10 last:border-0">
                            <td className="py-2 px-4 text-sm text-charcoal font-mono truncate max-w-xs">
                              {item.referrer}
                            </td>
                            <td className="py-2 px-4 text-sm text-charcoal text-right font-medium">
                              {item.count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal/60">No social visits recorded for this range</p>
                )}
              </div>

              {/* Search Sources */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">Top Search Sources</h3>
                {trafficData?.searchReferrers && trafficData.searchReferrers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-charcoal/10">
                          <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Search Engine</th>
                          <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.searchReferrers.map((item, index) => (
                          <tr key={index} className="border-b border-charcoal/10 last:border-0">
                            <td className="py-2 px-4 text-sm text-charcoal font-mono truncate max-w-xs">
                              {item.referrer}
                            </td>
                            <td className="py-2 px-4 text-sm text-charcoal text-right font-medium">
                              {item.count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal/60">No search visits recorded for this range</p>
                )}
              </div>
            </div>

            {/* UTM and Country Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* UTM Sources */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">UTM Sources</h3>
                {trafficData?.viewsByUtmSource && trafficData.viewsByUtmSource.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-charcoal/10">
                          <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Source</th>
                          <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.viewsByUtmSource.map((item, index) => (
                          <tr key={index} className="border-b border-charcoal/10 last:border-0">
                            <td className="py-2 px-4 text-sm text-charcoal">
                              {item.utmSource}
                            </td>
                            <td className="py-2 px-4 text-sm text-charcoal text-right font-medium">
                              {item.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal/60">
                    No UTM campaign data detected. Add parameters like <code className="font-mono">?utm_source=instagram&utm_campaign=autumn_drop</code> to your links to capture campaign performance here.
                  </p>
                )}
              </div>

              {/* Traffic by Country */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">Traffic by Country</h3>
                {trafficData?.viewsByCountry && trafficData.viewsByCountry.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-charcoal/10">
                          <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Country</th>
                          <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.viewsByCountry.map((item, index) => (
                          <tr key={index} className="border-b border-charcoal/10 last:border-0">
                            <td className="py-2 px-4 text-sm text-charcoal">
                              {item.country}
                            </td>
                            <td className="py-2 px-4 text-sm text-charcoal text-right font-medium">
                              {item.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal/60">No country data available</p>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Variant Performance Section */}
      <section>
        <div className="mb-6">
          <h2 className="font-serif text-3xl text-charcoal-dark mb-2">Variant Performance</h2>
          <p className="text-charcoal/60 text-sm">Breakdown by location, color, and size</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Locations */}
          <div className="bg-cream p-6 rounded-lg border border-charcoal/20 shadow-sm">
            <h3 className="font-serif text-xl text-charcoal mb-4">Top Locations</h3>
          {topLocations.length === 0 ? (
            <p className="text-sm text-charcoal/60">No location data available for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-charcoal/10">
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Location</th>
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Orders</th>
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topLocations.map((location) => (
                    <tr key={location.country} className="border-b border-charcoal/10 last:border-0">
                      <td className="py-2 px-4 text-sm text-charcoal">{location.country}</td>
                      <td className="py-2 px-4 text-sm text-charcoal">{location.count}</td>
                      <td className="py-2 px-4 text-sm text-charcoal">{formatCurrency(location.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

          {/* Color Performance */}
          <div className="bg-cream p-6 rounded-lg border border-charcoal/20 shadow-sm">
            <h3 className="font-serif text-xl text-charcoal mb-4">Color Performance</h3>
          {!data.colorPerformance || data.colorPerformance.length === 0 ? (
            <p className="text-sm text-charcoal/60">No color data available for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-charcoal/10">
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Color</th>
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Units</th>
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.colorPerformance.slice(0, 10).map((item) => (
                    <tr key={item.color} className="border-b border-charcoal/10 last:border-0">
                      <td className="py-2 px-4 text-sm text-charcoal font-medium">{item.color}</td>
                      <td className="py-2 px-4 text-sm text-charcoal">{item.quantity}</td>
                      <td className="py-2 px-4 text-sm text-charcoal">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

          {/* Size Performance */}
          <div className="bg-cream p-6 rounded-lg border border-charcoal/20 shadow-sm">
            <h3 className="font-serif text-xl text-charcoal mb-4">Size Performance</h3>
          {!data.sizePerformance || data.sizePerformance.length === 0 ? (
            <p className="text-sm text-charcoal/60">No size data available for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-charcoal/10">
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Size</th>
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Units</th>
                    <th className="text-left py-2 px-4 text-xs uppercase tracking-wider text-charcoal/60">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sizePerformance.slice(0, 10).map((item) => (
                    <tr key={item.size} className="border-b border-charcoal/10 last:border-0">
                      <td className="py-2 px-4 text-sm text-charcoal font-medium">{item.size}</td>
                      <td className="py-2 px-4 text-sm text-charcoal">{item.quantity}</td>
                      <td className="py-2 px-4 text-sm text-charcoal">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </section>

      {/* Revenue Trends Section */}
      <section>
        <div className="mb-6">
          <h2 className="font-serif text-3xl text-charcoal-dark mb-2">Revenue Trends</h2>
          <p className="text-charcoal/60 text-sm">Track your revenue performance over time</p>
        </div>

        <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md">
          <h3 className="font-serif text-xl text-charcoal mb-6">Revenue Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.revenueChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D4C9BA" />
            <XAxis
              dataKey="date"
              stroke="#2B2826"
              tick={{ fill: '#6B6560' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            />
            <YAxis stroke="#2B2826" tick={{ fill: '#6B6560' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#F5F3EE',
                border: '1px solid #D4C9BA',
                borderRadius: '8px',
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#2B2826"
              strokeWidth={2}
              dot={{ fill: '#2B2826', r: 4 }}
              activeDot={{ r: 6 }}
              name={`Revenue (${activeCurrency})`}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </section>

      {/* Order & Sales Analysis Section */}
      <section>
        <div className="mb-6">
          <h2 className="font-serif text-3xl text-charcoal-dark mb-2">Order & Sales Analysis</h2>
          <p className="text-charcoal/60 text-sm">Understand your order flow and top-performing products</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status Distribution */}
          <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md">
            <h3 className="font-serif text-xl text-charcoal mb-6">Order Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-charcoal/60 text-center py-12">No orders in this period</div>
          )}
        </div>

          {/* Best Sellers */}
          <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md">
            <h3 className="font-serif text-xl text-charcoal mb-6">Best Sellers</h3>
          {data.bestSellers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.bestSellers.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#D4C9BA" />
                <XAxis type="number" stroke="#2B2826" tick={{ fill: '#6B6560' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#2B2826"
                  tick={{ fill: '#6B6560' }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#F5F3EE',
                    border: '1px solid #D4C9BA',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#2B2826" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-charcoal/60 text-center py-12">No sales data</div>
          )}
        </div>
        </div>
      </section>

      {/* Inventory & Stock Section */}
      {data.lowStockProducts.length > 0 && (
        <section>
          <div className="mb-6">
            <h2 className="font-serif text-3xl text-charcoal-dark mb-2">Inventory Alerts</h2>
            <p className="text-charcoal/60 text-sm">Products running low on stock</p>
          </div>

          <div className="bg-cream-dark p-8 rounded-lg border border-beige shadow-md">
            <h3 className="font-serif text-xl text-charcoal-dark mb-6">Low Stock Alerts</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                    Variant
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                    Stock
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockProducts.map((product) => (
                  <tr key={product.id} className="border-b border-charcoal/10">
                    <td className="py-3 px-4 text-sm text-charcoal">
                      {product.productName}
                    </td>
                    <td className="py-3 px-4 text-sm text-charcoal/60">
                      {product.size} / {product.color}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-sm font-medium ${
                          product.stock <= 2
                            ? 'text-charcoal-dark'
                            : 'text-charcoal'
                        }`}
                      >
                        {product.stock} left
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-charcoal">
                      {formatCurrency(product.stock * product.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </section>
      )}

      {/* Product Performance Section */}
      <section>
        <div className="mb-6">
          <h2 className="font-serif text-3xl text-charcoal-dark mb-2">Product Performance</h2>
          <p className="text-charcoal/60 text-sm">Detailed breakdown of revenue, costs, and profitability by product</p>
        </div>

        <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md overflow-x-auto">
          <h3 className="font-serif text-xl text-charcoal mb-6">Full Product Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-charcoal/20">
                <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                  Product
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-charcoal">
                  Units
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-charcoal">
                  Revenue
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-charcoal">
                  Cost
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-charcoal">
                  Profit
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-charcoal">
                  Margin %
                </th>
              </tr>
            </thead>
            <tbody>
              {data.bestSellers.map((product) => (
                <tr key={product.id} className="border-b border-charcoal/10">
                  <td className="py-3 px-4 text-sm text-charcoal">{product.name}</td>
                  <td className="py-3 px-4 text-sm text-charcoal text-right">
                    {product.quantity}
                  </td>
                  <td className="py-3 px-4 text-sm text-charcoal text-right">
                    {formatCurrency(product.revenue)}
                  </td>
                  <td className="py-3 px-4 text-sm text-charcoal/60 text-right">
                    {formatCurrency(product.cost)}
                  </td>
                  <td className="py-3 px-4 text-sm text-charcoal-dark font-medium text-right">
                    {formatCurrency(product.profit)}
                  </td>
                  <td className="py-3 px-4 text-sm text-charcoal/70 text-right">
                    {product.profitMargin}%
                  </td>
                </tr>
              ))}
              {data.bestSellers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-charcoal/60">
                    No sales data for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </section>

      {/* Reset Statistics Section */}
      <section className="border-t border-charcoal/10 pt-6">
        <div className="rounded-md border border-charcoal/20 bg-beige/20 px-4 py-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-charcoal-dark">Danger zone</h3>
          <p className="mt-2 text-xs text-charcoal">
            Permanently delete all analytics and order history.
          </p>
          <div className="mt-4">
            <button
              onClick={handleResetStatistics}
              disabled={resetting}
              className="inline-flex items-center rounded-md border border-charcoal/30 bg-cream px-3 py-2 text-sm font-medium text-charcoal-dark transition-colors hover:bg-beige/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetting ? 'Resetting…' : 'Reset all statistics'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-charcoal/60 text-lg">Loading analytics...</div>
      </div>
    }>
      <AdminAnalyticsContent />
    </Suspense>
  );
}
