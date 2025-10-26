import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DeleteProductButton from '@/components/admin/DeleteProductButton';
import { formatCurrency } from '@/lib/currency';

export const dynamic = 'force-dynamic';

interface AdminProductsPageProps {
  searchParams?: Promise<{
    search?: string;
    status?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams?.search?.trim() ?? '';
  const statusFilter = (resolvedSearchParams?.status || 'all').toLowerCase();

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (statusFilter === 'active') {
    where.active = true;
  } else if (statusFilter === 'inactive') {
    where.active = false;
  }

  const products = await prisma.product.findMany({
    where,
    include: { collection: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-4xl text-charcoal-dark">Products</h1>
        <Link
          href="/admin/products/new"
          className="px-6 py-3 bg-charcoal-dark text-cream hover:bg-charcoal text-sm uppercase tracking-wider rounded-lg transition-colors"
        >
          Add Product
        </Link>
      </div>

      <div className="bg-cream-light p-6">
        <form action="/admin/products" className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-charcoal mb-1" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              name="search"
              defaultValue={search}
              placeholder="Search by name or description"
              className="input-modern"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className="select-modern"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="px-7 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
            >
              Apply
            </button>
            {(search || statusFilter !== 'all') && (
              <Link
                href="/admin/products"
                className="px-7 py-3 border border-charcoal/30 rounded-lg hover:border-charcoal transition-colors flex items-center"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        {products.length === 0 ? (
          <p className="text-charcoal-light">No products yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/10">
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Name</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Price</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Stock</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Collection</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Status</th>
                  <th className="text-left py-3 text-sm uppercase tracking-wider text-charcoal-light">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-charcoal/10">
                    <td className="py-3 text-sm text-charcoal">{product.name}</td>
                    <td className="py-3 text-sm text-charcoal">{formatCurrency(product.price)}</td>
                    <td className="py-3 text-sm text-charcoal">
                      {product.stock}
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="ml-2 text-xs text-beige">(Low)</span>
                      )}
                      {product.stock === 0 && (
                        <span className="ml-2 text-xs text-charcoal-dark">(Out)</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-charcoal-light">
                      {product.collection?.name || '-'}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit items-center px-3 py-1.5 text-xs rounded-lg uppercase tracking-wider ${
                            product.comingSoon
                              ? 'bg-charcoal-dark text-cream'
                              : product.active
                              ? 'bg-beige/30 text-charcoal-dark'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {product.comingSoon ? 'Coming Soon' : product.active ? 'Active' : 'Inactive'}
                        </span>
                        {product.comingSoon && product.releaseDate && (
                          <span className="text-xs text-charcoal/70">
                            Launches {new Date(product.releaseDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-sm text-charcoal hover:underline"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/analytics?product=${product.id}`}
                          className="text-sm text-beige hover:underline"
                        >
                          Analytics
                        </Link>
                        <DeleteProductButton productId={product.id} productName={product.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
