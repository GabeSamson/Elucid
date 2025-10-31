import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackImages, parseProductImages } from '@/lib/productImages';

const parsePriceOverrides = (raw: string | null): Record<string, number> => {
  if (!raw) return {};

  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return {};

    return Object.entries(data as Record<string, unknown>).reduce<Record<string, number>>(
      (acc, [currency, value]) => {
        if (typeof currency !== 'string') return acc;
        const code = currency.toUpperCase();
        const numeric = typeof value === 'number' ? value : parseFloat(String(value));
        if (Number.isFinite(numeric)) {
          acc[code] = numeric;
        }
        return acc;
      },
      {},
    );
  } catch (error) {
    console.warn('Failed to parse priceOverrides', error);
    return {};
  }
};

const parseSizeDimensions = (raw: string | null): Record<string, string> | null => {
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data as Record<string, string>;
  } catch (error) {
    console.warn('Failed to parse sizeDimensions', error);
    return null;
  }
};

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
      priceOverrides: parsePriceOverrides(product.priceOverrides),
      sizeDimensions: parseSizeDimensions(product.sizeDimensions),
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
