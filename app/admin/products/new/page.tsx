import { prisma } from '@/lib/prisma';
import NewProductForm from '@/components/admin/NewProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  // Fetch collections for dropdown
  const collections = await prisma.collection.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-charcoal mb-2">
          Create New Product
        </h1>
        <p className="text-charcoal/60">
          Add a new product to your store with sizes, colors, and inventory.
        </p>
      </div>

      <NewProductForm collections={collections} />
    </div>
  );
}
