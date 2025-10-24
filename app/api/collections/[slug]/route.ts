import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackImages, parseProductImages } from '@/lib/productImages';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          where: {
            active: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Parse JSON arrays in products
    const collectionWithParsedProducts = {
      ...collection,
      products: collection.products.map(product => {
        const imagePayload = parseProductImages(product.images);
        return {
          ...product,
          images: getFallbackImages(imagePayload),
          colorImages: imagePayload.colorImages,
          sizes: JSON.parse(product.sizes || '[]'),
          colors: JSON.parse(product.colors || '[]'),
        };
      }),
    };

    return NextResponse.json({ collection: collectionWithParsedProducts }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
