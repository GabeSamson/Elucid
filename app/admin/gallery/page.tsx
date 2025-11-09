import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import PhotoshootGalleryManager from "@/components/admin/PhotoshootGalleryManager";

export const dynamic = "force-dynamic";

async function deletePhotoshootImageAction(id: string) {
  "use server";

  await prisma.photoshootImage.delete({
    where: { id },
  });

  revalidatePath("/admin/gallery");
  revalidatePath("/admin/homepage");
  revalidatePath("/");
}

async function updatePhotoshootImageAction(id: string, title: string) {
  "use server";

  await prisma.photoshootImage.update({
    where: { id },
    data: { title },
  });

  revalidatePath("/admin/gallery");
}

async function toggleSlideshowAction(id: string, showInSlideshow: boolean) {
  "use server";

  await prisma.photoshootImage.update({
    where: { id },
    data: { showInSlideshow },
  });

  revalidatePath("/admin/gallery");
  revalidatePath("/admin/homepage");
  revalidatePath("/");
}

async function reorderPhotoshootImagesAction(imageIds: string[]) {
  "use server";

  // Update display order for each image
  await Promise.all(
    imageIds.map((id, index) =>
      prisma.photoshootImage.update({
        where: { id },
        data: { displayOrder: index },
      })
    )
  );

  revalidatePath("/admin/gallery");
  revalidatePath("/admin/homepage");
  revalidatePath("/");
}

async function createPhotoshootImageAction(imageUrl: string, title?: string) {
  "use server";

  const maxOrder = await prisma.photoshootImage.findFirst({
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  await prisma.photoshootImage.create({
    data: {
      imageUrl,
      title: title || null,
      displayOrder: (maxOrder?.displayOrder ?? -1) + 1,
    },
  });

  revalidatePath("/admin/gallery");
  revalidatePath("/admin/homepage");
  revalidatePath("/");
}

interface AdminGalleryPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminGalleryPage({ searchParams }: AdminGalleryPageProps) {
  noStore();

  const images = await prisma.photoshootImage.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const resolvedSearchParams = await searchParams;
  const success = typeof resolvedSearchParams?.success === "string" ? resolvedSearchParams?.success : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl text-charcoal-dark">Photoshoot Gallery</h1>
        <p className="text-charcoal/70">
          Manage all your photoshoot images. Upload images here and select which ones to display on the homepage.
        </p>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success === "gallery-updated" && "Gallery updated successfully."}
        </div>
      )}

      <div className="max-w-6xl">
        <PhotoshootGalleryManager
          images={images}
          onDelete={deletePhotoshootImageAction}
          onUpdate={updatePhotoshootImageAction}
          onToggleSlideshow={toggleSlideshowAction}
          onReorder={reorderPhotoshootImagesAction}
          onCreate={createPhotoshootImageAction}
        />
      </div>
    </div>
  );
}
