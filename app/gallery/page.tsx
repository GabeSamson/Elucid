import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PhotoshootGallery from "@/components/PhotoshootGallery";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Gallery - Elucid London",
  description: "Explore our photoshoot gallery featuring our latest collections and creative work. Made in London.",
  openGraph: {
    title: "Gallery - Elucid London",
    description: "Explore our photoshoot gallery featuring our latest collections and creative work.",
    images: ['/icon.png'],
  },
};

export default async function GalleryPage() {
  const homepageConfig = await prisma.homepageConfig.findUnique({
    where: { id: "main" },
    select: { photoshootImages: true },
  });

  let images: Array<{ id: string; imageUrl: string; title: string | null }> = [];
  if (homepageConfig?.photoshootImages) {
    try {
      const parsed = JSON.parse(homepageConfig.photoshootImages);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const isOldFormat = typeof parsed[0] === "string" && (parsed[0].startsWith("http://") || parsed[0].startsWith("https://") || parsed[0].startsWith("/"));

        if (isOldFormat) {
          images = parsed
            .filter((url): url is string => typeof url === "string" && url.trim() !== "")
            .map((url, index) => ({ id: `legacy-${index}`, imageUrl: url, title: null }));
        } else {
          const selectedIds = parsed.filter((id): id is string => typeof id === "string" && id.trim() !== "");
          const selectedImages = await prisma.photoshootImage.findMany({
            where: {
              id: { in: selectedIds },
              active: true,
            },
            select: {
              id: true,
              imageUrl: true,
              title: true,
            },
          });

          images = selectedIds
            .map((id) => selectedImages.find((img) => img.id === id))
            .filter((img): img is { id: string; imageUrl: string; title: string | null } => img !== undefined);
        }
      }
    } catch (error) {
      console.error("Failed to parse homepage photoshoot images:", error);
    }
  }

  // Public gallery page has its own separate title/subtitle
  const galleryTitle = "Gallery";
  const gallerySubtitle = "Explore our latest photoshoots and creative work";
  const galleryShowTitles = true; // Show titles by default on public gallery

  return (
    <main>
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>

      <div className="pt-24 md:pt-28">
        {images.length > 0 ? (
          <PhotoshootGallery
            images={images}
            enableSlideshow={false}
            title={galleryTitle}
            subtitle={gallerySubtitle}
            showImageTitles={galleryShowTitles}
          />
        ) : (
          <section className="min-h-screen py-20 px-6 bg-charcoal-dark flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-serif text-4xl md:text-6xl text-cream mb-4">Gallery</h1>
              <p className="text-cream-light text-lg">Coming soon - Check back later for our latest photoshoots</p>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
