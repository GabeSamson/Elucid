import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    if (!product || !product.isActive) {
      return {
        title: 'Product Not Found',
        description: 'The product you are looking for does not exist.',
      };
    }

    // Calculate average rating
    const averageRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    const firstImage = product.images && product.images.length > 0
      ? (product.images as string[])[0]
      : '/icon.png';

    const productUrl = `https://www.elucid.london/products/${product.id}`;

    // Calculate discount percentage
    const discountPercent = product.compareAtPrice
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

    const title = `${product.name} | Elucid London`;
    const description = product.description.length > 160
      ? product.description.substring(0, 157) + '...'
      : product.description;

    // JSON-LD Structured Data
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: firstImage,
      url: productUrl,
      brand: {
        '@type': 'Brand',
        name: 'Elucid London',
      },
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'GBP',
        price: product.price.toFixed(2),
        priceValidUntil: product.releaseDate || undefined,
        availability: product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'Elucid London',
        },
      },
      ...(product.reviews.length > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: averageRating.toFixed(1),
          reviewCount: product.reviews.length,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    };

    return {
      title,
      description,
      keywords: [
        product.name,
        'streetwear',
        'London fashion',
        'Elucid',
        ...(product.targetAudience ? [product.targetAudience] : []),
        ...(product.materials ? ['sustainable fashion'] : []),
      ],
      openGraph: {
        type: 'website',
        url: productUrl,
        title,
        description,
        siteName: 'Elucid London',
        images: [
          {
            url: firstImage,
            width: 1200,
            height: 1200,
            alt: product.name,
          },
        ],
        ...(discountPercent && {
          tags: [`${discountPercent}% off`],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [firstImage],
        creator: '@elucid.ldn',
      },
      alternates: {
        canonical: productUrl,
      },
      other: {
        'product:price:amount': product.price.toString(),
        'product:price:currency': 'GBP',
        ...(discountPercent && {
          'product:sale_price:amount': product.price.toString(),
          'product:original_price:amount': product.compareAtPrice?.toString(),
        }),
      },
      // Add JSON-LD script
      ...(jsonLd && {
        script: [{
          type: 'application/ld+json',
          children: JSON.stringify(jsonLd),
        }],
      } as any),
    };
  } catch (error) {
    console.error('Error generating product metadata:', error);
    return {
      title: 'Product | Elucid London',
      description: 'Contemporary streetwear crafted in London',
    };
  }
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
