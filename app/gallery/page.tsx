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
  // Get all active gallery images
  const images = await prisma.photoshootImage.findMany({
    where: {
      active: true,
    },
    orderBy: {
      displayOrder: 'asc',
    },
    select: {
      id: true,
      imageUrl: true,
      title: true,
    },
  });

  // Public gallery page has its own separate title/subtitle
  const galleryTitle = "Gallery";
  const gallerySubtitle = "Explore our latest photoshoots and creative work";
  const galleryShowTitles = true; // Show titles by default on public gallery

  return (
    <main>
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>

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

      <Footer />
    </main>
  );
}
