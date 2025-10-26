import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import CollectionHeroUploader from "@/components/admin/CollectionHeroUploader";

export const dynamic = "force-dynamic";

async function updateCollectionAction(formData: FormData) {
  "use server";

  const collectionId = formData.get("collectionId")?.toString();
  const currentPath = collectionId ? `/admin/collections/${collectionId}` : "/admin/collections";

  if (!collectionId) {
    redirect(`${currentPath}?error=missing-collection`);
  }

  const existing = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!existing) {
    redirect(`/admin/collections?error=collection-not-found`);
  }

  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() || null;
  const imageUrlInput = formData.get("imageUrl")?.toString().trim() || "";
  const manualSlug = formData.get("slug")?.toString().trim() || "";

  if (!name) {
    redirect(`${currentPath}?error=missing-name`);
  }

  const slug = manualSlug ? slugify(manualSlug) : slugify(name);

  if (!slug) {
    redirect(`${currentPath}?error=invalid-slug`);
  }

  if (slug !== existing.slug) {
    const conflicting = await prisma.collection.findFirst({
      where: {
        slug,
        NOT: { id: collectionId },
      },
    });

    if (conflicting) {
      redirect(`${currentPath}?error=collection-exists`);
    }
  }

  try {
    await prisma.collection.update({
      where: { id: collectionId },
      data: {
        name,
        slug,
        description,
        imageUrl: imageUrlInput || null,
      },
    });
  } catch (error) {
    console.error("Failed to update collection", error);
    redirect(`${currentPath}?error=update-failed`);
  }

  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath(`/collections/${existing.slug}`);
  revalidatePath(`/collections/${slug}`);

  redirect(`${currentPath}?success=collection-updated`);
}

interface AdminEditCollectionPageProps {
  params: Promise<{ collectionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminEditCollectionPage({
  params,
  searchParams,
}: AdminEditCollectionPageProps) {
  noStore();

  const { collectionId } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const success =
    typeof resolvedSearchParams?.success === "string" ? resolvedSearchParams.success : null;
  const error =
    typeof resolvedSearchParams?.error === "string" ? resolvedSearchParams.error : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl text-charcoal-dark">Edit collection</h1>
          <p className="text-charcoal/70">
            Update the details for this collection. Changes apply immediately once saved.
          </p>
        </div>
        <Link
          href="/admin/collections"
          className="inline-flex items-center gap-2 rounded-lg border border-charcoal/20 px-4 py-2 text-xs uppercase tracking-wider text-charcoal hover:border-charcoal transition-colors"
        >
          ← Back to collections
        </Link>
      </div>

      {success && (
        <div className="rounded-lg border border-beige bg-beige/20 px-4 py-3 text-sm text-charcoal">
          {success === "collection-updated" && "Collection updated successfully."}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-charcoal bg-cream-dark px-4 py-3 text-sm text-charcoal-dark">
          {error === "missing-name" && "Give the collection a name before saving."}
          {error === "invalid-slug" && "Please provide a valid slug using letters and numbers only."}
          {error === "collection-exists" &&
            "That slug already exists. Try a different name or slug value."}
          {error === "missing-collection" && "We couldn't identify which collection to update."}
          {error === "update-failed" && "Unable to update this collection. Please try again."}
        </div>
      )}

      <form action={updateCollectionAction} className="space-y-6 rounded-2xl border border-charcoal/10 bg-cream p-6">
        <input type="hidden" name="collectionId" value={collection.id} />

        <div>
          <label className="mb-2 block text-sm font-medium text-charcoal">
            Collection name
          </label>
          <input
            name="name"
            defaultValue={collection.name}
            placeholder="Display name for this collection"
            className="input-modern"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-charcoal">
            Custom slug
          </label>
          <input
            name="slug"
            defaultValue={collection.slug}
            placeholder="URL-friendly identifier"
            className="input-modern"
          />
          <p className="mt-1 text-xs text-charcoal/60">
            Leave unchanged to continue using the current slug.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-charcoal">
            Description
          </label>
          <textarea
            name="description"
            defaultValue={collection.description ?? ""}
            placeholder="Brief description of this collection"
            className="input-modern min-h-[100px]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-charcoal">
            Hero image
          </label>
          <CollectionHeroUploader defaultImageUrl={collection.imageUrl} />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-charcoal px-7 py-3 text-cream transition-colors hover:bg-charcoal/90"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
