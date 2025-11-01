import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range and product filter from query params
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const productId = searchParams.get('product');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause for orders
    const orderWhere: any = {
      createdAt: {
        gte: startDate,
      },
    };

    // If filtering by product, only get orders containing that product
    if (productId) {
      orderWhere.items = {
        some: {
          productId: productId,
        },
      };
    }

    // Fetch all orders within date range (and optionally filtered by product)
    const orders = await prisma.order.findMany({
      where: orderWhere,
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

    // Calculate revenue over time (daily)
    const revenueByDay: { [key: string]: number } = {};
    const ordersByDay: { [key: string]: number } = {};

    const locationMap: { [country: string]: { count: number; revenue: number } } = {};
    const customerOrderCounts: { [key: string]: number } = {};

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + order.total;
      ordersByDay[dateKey] = (ordersByDay[dateKey] || 0) + 1;

      let countryLabel = 'Unknown';
      try {
        const parsedAddress = order.address ? JSON.parse(order.address) : {};
        if (parsedAddress && typeof parsedAddress === 'object') {
          if (order.isInPerson) {
            // For in-person sales, use location if provided, otherwise "In-Person"
            countryLabel = parsedAddress.location || 'In-Person';
          } else {
            countryLabel = parsedAddress.country || parsedAddress.countryCode || countryLabel;
          }
        }
      } catch (error) {
        // ignore malformed
      }

      if (order.isInPerson && countryLabel === 'Unknown') {
        countryLabel = 'In-Person';
      }

      if (!locationMap[countryLabel]) {
        locationMap[countryLabel] = { count: 0, revenue: 0 };
      }
      locationMap[countryLabel].count += 1;
      locationMap[countryLabel].revenue += order.total;

      const customerKey = order.email || `${order.name || 'walk-in'}-${order.id}`;
      customerOrderCounts[customerKey] = (customerOrderCounts[customerKey] || 0) + 1;
    });

    const revenueChart = Object.entries(revenueByDay)
      .map(([date, revenue]) => ({
        date,
        revenue: parseFloat(revenue.toFixed(2)),
        orders: ordersByDay[date] || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate order status breakdown
    const ordersByStatus: { [key: string]: number } = {};
    orders.forEach((order) => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });

    // Calculate best selling products
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number; cost: number; profit: number } } = {};
    const colorSales: { [key: string]: { quantity: number; revenue: number; orders: number } } = {};
    const sizeSales: { [key: string]: { quantity: number; revenue: number; orders: number } } = {};

    orders.forEach((order) => {
      // Calculate discount ratio to properly distribute order-level discounts
      const orderSubtotal = order.subtotal;
      const orderTotal = order.total;
      const discountRatio = orderSubtotal > 0 ? orderTotal / orderSubtotal : 1;

      order.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        // Calculate item revenue before discount
        const itemSubtotalRevenue = item.priceAtPurchase * item.quantity;
        // Apply proportional discount from order total
        const itemActualRevenue = itemSubtotalRevenue * discountRatio;

        const costPrice = item.product?.costPrice || 0;
        const shippingCost = item.product?.shippingCost || 0;
        const cost = (costPrice + shippingCost) * item.quantity;
        const profit = itemActualRevenue - cost;

        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += itemActualRevenue;
        productSales[item.productId].cost += cost;
        productSales[item.productId].profit += profit;

        // Track color performance (with discount applied)
        if (item.color) {
          if (!colorSales[item.color]) {
            colorSales[item.color] = { quantity: 0, revenue: 0, orders: 0 };
          }
          colorSales[item.color].quantity += item.quantity;
          colorSales[item.color].revenue += itemActualRevenue;
        }

        // Track size performance (with discount applied)
        if (item.size) {
          if (!sizeSales[item.size]) {
            sizeSales[item.size] = { quantity: 0, revenue: 0, orders: 0 };
          }
          sizeSales[item.size].quantity += item.quantity;
          sizeSales[item.size].revenue += itemActualRevenue;
        }
      });

      // Count unique orders per color
      const colorsInOrder = new Set(order.items.map(item => item.color).filter(Boolean));
      colorsInOrder.forEach(color => {
        if (color && colorSales[color]) {
          colorSales[color].orders += 1;
        }
      });

      // Count unique orders per size
      const sizesInOrder = new Set(order.items.map(item => item.size).filter(Boolean));
      sizesInOrder.forEach(size => {
        if (size && sizeSales[size]) {
          sizeSales[size].orders += 1;
        }
      });
    });

    const bestSellers = Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        quantity: data.quantity,
        revenue: parseFloat(data.revenue.toFixed(2)),
        cost: parseFloat(data.cost.toFixed(2)),
        profit: parseFloat(data.profit.toFixed(2)),
        profitMargin: data.revenue > 0 ? parseFloat(((data.profit / data.revenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate summary metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate unique customers
    const uniqueCustomers = Object.keys(customerOrderCounts).length;

    // Get low stock products
    const lowStockProducts = await prisma.productVariant.findMany({
      where: {
        stock: {
          lte: 5,
          gt: 0,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        stock: 'asc',
      },
      take: 10,
    });

    // Calculate total inventory value
    const allProducts = await prisma.product.findMany({
      where: { active: true },
      include: { variants: true },
    });

    const inventoryValue = allProducts.reduce((sum, product) => {
      if (product.variants.length > 0) {
        const productValue = product.variants.reduce(
          (vSum, variant) => vSum + variant.stock * product.price,
          0
        );
        return sum + productValue;
      }
      return sum + product.stock * product.price;
    }, 0);

    // Calculate total profit
    const totalProfit = Object.values(productSales).reduce((sum, product) => sum + product.profit, 0);
    const totalCost = Object.values(productSales).reduce((sum, product) => sum + product.cost, 0);

    // Customer insights
    const returningCustomers = Object.values(customerOrderCounts).filter((count) => count > 1).length;
    const newCustomers = uniqueCustomers - returningCustomers;

    const locationStats = Object.entries(locationMap)
      .map(([country, stats]) => ({
        country,
        count: stats.count,
        revenue: parseFloat(stats.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count);

    const colorPerformance = Object.entries(colorSales)
      .map(([color, stats]) => ({
        color,
        quantity: stats.quantity,
        revenue: parseFloat(stats.revenue.toFixed(2)),
        orders: stats.orders,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const sizePerformance = Object.entries(sizeSales)
      .map(([size, stats]) => ({
        size,
        quantity: stats.quantity,
        revenue: parseFloat(stats.revenue.toFixed(2)),
        orders: stats.orders,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Get filtered product info if applicable
    let filteredProduct = null;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true },
      });
      filteredProduct = product;
    }

    return NextResponse.json({
      filteredProduct,
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        profitMargin: totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0,
        totalOrders,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        uniqueCustomers,
        newCustomers,
        returningCustomers,
        inventoryValue: parseFloat(inventoryValue.toFixed(2)),
      },
      revenueChart,
      ordersByStatus,
      bestSellers,
      colorPerformance,
      sizePerformance,
      lowStockProducts: lowStockProducts.map((variant) => ({
        id: variant.id,
        productName: variant.product.name,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
        price: variant.product.price,
      })),
      locations: locationStats,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
