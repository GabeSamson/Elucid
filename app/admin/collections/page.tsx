import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import CollectionHeroUploader from "@/components/admin/CollectionHeroUploader";

export const dynamic = "force-dynamic";

async function createCollectionAction(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() || null;
  const imageUrl = formData.get("imageUrl")?.toString().trim() || null;
  const manualSlug = formData.get("slug")?.toString().trim() || "";

  if (!name) {
    redirect("/admin/collections?error=missing-name");
  }

  const slug = manualSlug ? slugify(manualSlug) : slugify(name);

  if (!slug) {
    redirect("/admin/collections?error=invalid-slug");
  }

  try {
    await prisma.collection.create({
      data: {
        name,
        slug,
        description,
        imageUrl,
      },
    });
  } catch (error) {
    console.error("Failed to create collection", error);
    redirect("/admin/collections?error=collection-exists");
  }

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");

  redirect("/admin/collections?success=collection-created");
}

async function deleteCollectionAction(formData: FormData) {
  "use server";

  const collectionId = formData.get("collectionId")?.toString();

  if (!collectionId) {
    redirect("/admin/collections?error=missing-collection");
  }

  try {
    await prisma.collection.delete({
      where: { id: collectionId },
    });
  } catch (error) {
    console.error("Failed to delete collection", error);
    redirect("/admin/collections?error=delete-failed");
  }

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");

  redirect("/admin/collections?success=collection-deleted");
}

interface AdminCollectionsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCollectionsPage({ searchParams }: AdminCollectionsPageProps) {
  noStore();

  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
  });

  const resolvedSearchParams = await searchParams;
  const success = typeof resolvedSearchParams?.success === "string" ? resolvedSearchParams?.success : null;
  const error = typeof resolvedSearchParams?.error === "string" ? resolvedSearchParams?.error : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl text-charcoal-dark">Collections</h1>
        <p className="text-charcoal/70">
          Organize your products into collections for easier browsing.
        </p>
      </div>

      {success && (
        <div className="rounded-lg border border-beige bg-beige/20 px-4 py-3 text-sm text-charcoal">
          {success === "collection-created" && "New collection created successfully."}
          {success === "collection-deleted" && "Collection deleted successfully."}
          {success === "collection-updated" && "Collection updated successfully."}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-charcoal bg-cream-dark px-4 py-3 text-sm text-charcoal-dark">
          {error === "missing-name" && "Give the collection a name before saving."}
          {error === "invalid-slug" && "Please provide a valid slug using letters and numbers only."}
          {error === "collection-exists" &&
            "That slug already exists. Try a different name or slug value."}
          {error === "missing-collection" && "We couldn't identify which collection to delete."}
          {error === "delete-failed" &&
            "Unable to delete this collection. Ensure it is not linked to products and try again."}
          {error === "collection-not-found" &&
            "We couldn't find that collection. It may have been removed already."}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-6 rounded-2xl border border-charcoal/10 bg-cream p-6">
          <header>
            <h2 className="text-xl font-semibold text-charcoal">Create collection</h2>
            <p className="text-sm text-charcoal/70">
              Add a new product collection to your store.
            </p>
          </header>

          <form action={createCollectionAction} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">
                Collection name
              </label>
              <input
                name="name"
                placeholder="Display name for this collection"
                className="input-modern"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">
                Custom slug (optional)
              </label>
              <input
                name="slug"
                placeholder="URL-friendly identifier (auto-generated if empty)"
                className="input-modern"
              />
              <p className="mt-1 text-xs text-charcoal/60">
                Leave blank to auto-generate from the name.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">
                Description
              </label>
              <textarea
                name="description"
                placeholder="Brief description of this collection"
                className="input-modern min-h-[100px]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">
                Hero image
              </label>
              <CollectionHeroUploader />
            </div>
            <button
              type="submit"
              className="w-full px-7 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
            >
              Create collection
            </button>
          </form>
        </aside>

        <section className="space-y-6 rounded-2xl border border-charcoal/10 bg-cream p-6">
          <header>
            <h2 className="text-xl font-semibold text-charcoal">Existing collections</h2>
            <p className="text-sm text-charcoal/70">
              All collections currently available in your store.
            </p>
          </header>

          <div className="space-y-3">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="flex flex-col gap-4 rounded-xl border border-charcoal/15 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-charcoal">{collection.name}</p>
                  <p className="text-xs uppercase tracking-wide text-charcoal/50">
                    /collections/{collection.slug}
                  </p>
                  {collection.description && (
                    <p className="mt-2 text-sm text-charcoal/70">{collection.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/admin/collections/${collection.id}`}
                    className="rounded-lg border border-charcoal/20 px-4 py-2 text-xs uppercase tracking-wider text-charcoal hover:border-charcoal transition-colors"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="rounded-lg border border-charcoal/20 px-4 py-2 text-xs uppercase tracking-wider text-charcoal hover:border-charcoal transition-colors"
                  >
                    View
                  </Link>
                  <form action={deleteCollectionAction}>
                    <input type="hidden" name="collectionId" value={collection.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-500/40 px-4 py-2 text-xs uppercase tracking-wider text-red-600 hover:border-red-600 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {collections.length === 0 && (
              <p className="text-sm text-charcoal/60">No collections yet. Create your first one above.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
