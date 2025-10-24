import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackImages, parseProductImages } from '@/lib/productImages';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        active: true,
      },
      include: {
        collection: true,
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Parse JSON strings for arrays
    const imagePayload = parseProductImages(product.images);
    const productWithParsedArrays = {
      ...product,
      images: getFallbackImages(imagePayload),
      colorImages: imagePayload.colorImages,
      sizes: JSON.parse(product.sizes || '[]'),
      colors: JSON.parse(product.colors || '[]'),
      variants: product.variants,
    };

    return NextResponse.json({ product: productWithParsedArrays }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
