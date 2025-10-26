import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackImages, parseProductImages } from '@/lib/productImages';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collectionId = searchParams.get('collection');
    const featured = searchParams.get('featured');
    const limit = searchParams.get('limit');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    const search = (searchParams.get('search') || '').trim();

    const filters: any[] = [];

    if (collectionId) {
      filters.push({ collectionId });
    }

    if (search) {
      const terms = search
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean);

      terms.forEach((term) => {
        filters.push({
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        });
      });
    }

    const where: any = {
      active: true,
      ...(filters.length > 0 ? { AND: filters } : {}),
    };

    if (featured === 'true') {
      where.featured = true;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        collection: true,
        variants: true,
      },
      orderBy: {
        [sort]: order === 'asc' ? 'asc' : 'desc',
      },
      take: limit ? parseInt(limit) : undefined,
    });

    // Parse JSON strings for arrays
    const productsWithParsedArrays = products.map(product => {
      const imagePayload = parseProductImages(product.images);
      return {
        ...product,
        images: getFallbackImages(imagePayload),
        colorImages: imagePayload.colorImages,
        sizes: JSON.parse(product.sizes || '[]'),
        colors: JSON.parse(product.colors || '[]'),
        variants: product.variants,
      };
    });

    return NextResponse.json({ products: productsWithParsedArrays }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
