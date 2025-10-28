'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatCurrency, getActiveCurrency } from '@/lib/currency';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

interface TrafficAnalyticsData {
  totalViews: number;
  viewsByPath: Array<{ path: string; count: number }>;
  viewsByReferrer: Array<{ referrer: string; count: number }>;
  viewsByUtmSource: Array<{ utmSource: string; count: number }>;
  viewsByCountry: Array<{ country: string; count: number }>;
  dailyViews: Array<{ date: string; count: number }>;
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
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
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
        ) : trafficData ? (
          <>
            {/* Traffic Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Total Page Views</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData.totalViews.toLocaleString()}
                </div>
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Unique Pages</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData.viewsByPath.length}
                </div>
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Referral Sources</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData.viewsByReferrer.length}
                </div>
              </div>

              <div className="bg-cream-light p-6 rounded-lg border border-charcoal/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-wider text-charcoal/60 mb-2">Countries</div>
                <div className="text-3xl font-serif text-charcoal-dark">
                  {trafficData.viewsByCountry.length}
                </div>
              </div>
            </div>

            {/* Daily Page Views Chart */}
            <div className="bg-white p-8 rounded-lg border border-charcoal/10 shadow-md mb-8">
              <h3 className="font-serif text-xl text-charcoal mb-6">Page Views Over Time</h3>
              {trafficData.dailyViews.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trafficData.dailyViews}>
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
                      formatter={(value: number) => [value, 'Page Views']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2B2826"
                      strokeWidth={2}
                      dot={{ fill: '#2B2826', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Page Views"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-charcoal/60 text-center py-12">No traffic data for this period</div>
              )}
            </div>

            {/* Traffic Breakdown Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Pages */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">Top Pages</h3>
                {trafficData.viewsByPath.length > 0 ? (
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
                {trafficData.viewsByReferrer.length > 0 ? (
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

            {/* UTM and Country Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* UTM Sources */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">UTM Sources</h3>
                {trafficData.viewsByUtmSource.length > 0 ? (
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
                  <p className="text-sm text-charcoal/60">No UTM campaign data available</p>
                )}
              </div>

              {/* Traffic by Country */}
              <div className="bg-white p-6 rounded-lg border border-charcoal/10 shadow-sm">
                <h3 className="font-serif text-xl text-charcoal mb-4">Traffic by Country</h3>
                {trafficData.viewsByCountry.length > 0 ? (
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
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-charcoal/60">No traffic data available</div>
          </div>
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
