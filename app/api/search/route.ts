import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Fuse from 'fuse.js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Fetch all active products
    const products = await prisma.product.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        compareAtPrice: true,
        images: true,
        stock: true,
        colors: true,
        sizes: true,
        targetAudience: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Configure Fuse.js for fuzzy search
    const fuse = new Fuse(products, {
      keys: [
        { name: 'name', weight: 2 }, // Name is most important
        { name: 'description', weight: 1 },
        { name: 'targetAudience', weight: 0.5 },
      ],
      threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
      distance: 100, // Maximum distance for fuzzy match
      minMatchCharLength: 2,
      includeScore: true,
      useExtendedSearch: false,
      ignoreLocation: true, // Search anywhere in the text
    });

    // Perform fuzzy search
    const searchResults = fuse.search(query, { limit });

    // Extract products from search results
    const matchedProducts = searchResults.map(result => result.item);

    return NextResponse.json({
      products: matchedProducts,
      count: matchedProducts.length,
      query,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}
