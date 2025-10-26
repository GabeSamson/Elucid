import { prisma } from '@/lib/prisma';
import EditProductForm from '@/components/admin/EditProductForm';
import { notFound } from 'next/navigation';
import { parseProductImages } from '@/lib/productImages';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch product data
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
      collection: true,
    },
  });

  if (!product) {
    notFound();
  }

  // Fetch collections for dropdown
  const collections = await prisma.collection.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  // Parse JSON fields and format data for form
  const imagePayload = parseProductImages(product.images);
  const initialData = {
    name: product.name,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice || undefined,
    costPrice: product.costPrice || undefined,
    images: imagePayload.defaultImages,
    colorImages: imagePayload.colorImages,
    sizes: JSON.parse(product.sizes),
    colors: JSON.parse(product.colors),
    variants: product.variants.map((v) => ({
      size: v.size,
      color: v.color,
      stock: v.stock,
      sku: v.sku || undefined,
    })),
    collectionId: product.collectionId || undefined,
    featured: product.featured,
    active: product.active,
    includeShipping: product.includeShipping,
    comingSoon: product.comingSoon,
    releaseDate: product.releaseDate ? product.releaseDate.toISOString() : null,
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-charcoal mb-2">
          Edit Product
        </h1>
        <p className="text-charcoal/60">
          Update product details, inventory, and settings.
        </p>
      </div>

      <EditProductForm
        productId={id}
        initialData={initialData}
        collections={collections}
      />
    </div>
  );
}
