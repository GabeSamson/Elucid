import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WritingSection from "@/components/WritingSection";
import Featured from "@/components/Featured";
import PhotoshootGallery from "@/components/PhotoshootGallery";
import Reviews from "@/components/Reviews";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Elucid London - Modern Streetwear",
  description: "Contemporary streetwear crafted in London. Discover our latest collection of modern urban fashion. Made in London.",
  openGraph: {
    title: "Elucid London - Modern Streetwear",
    description: "Contemporary streetwear crafted in London. Discover our latest collection of modern urban fashion.",
    images: ['/icon.png'],
  },
};

export default async function Home() {
  const [config, session] = await Promise.all([
    prisma.homepageConfig.findUnique({
      where: { id: "main" },
    }),
    auth(),
  ]);

  const isAdmin = session?.user?.role === "admin";

  const showFeedbackSection = config?.showFeedbackSection ?? false;
  const showPhotoshootGallery = config?.showPhotoshootGallery ?? false;
  const photoshootSlideshow = config?.photoshootSlideshow ?? false;
  const galleryTitle = config?.galleryTitle ?? null;
  const gallerySubtitle = config?.gallerySubtitle ?? null;
  const galleryShowTitles = config?.galleryShowTitles ?? false;
  const lockHomepage = config?.lockHomepage ?? false;

  let photoshootImages: Array<{ id: string; imageUrl: string; title: string | null }> = [];
  if (showPhotoshootGallery && config?.photoshootImages) {
    try {
      const parsed = JSON.parse(config.photoshootImages);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check if this is old format (URLs) or new format (IDs)
        const isOldFormat = typeof parsed[0] === 'string' && (
          parsed[0].startsWith('http://') ||
          parsed[0].startsWith('https://') ||
          parsed[0].startsWith('/')
        );

        if (isOldFormat) {
          // Old format: array of URL strings
          // Convert to new format for display
          photoshootImages = parsed
            .filter((url): url is string => typeof url === 'string')
            .map((url, index) => ({
              id: `legacy-${index}`,
              imageUrl: url,
              title: null,
            }));
        } else {
          // New format: array of IDs
          // Fetch the actual image records that are enabled for slideshow
          const images = await prisma.photoshootImage.findMany({
            where: {
              id: { in: parsed },
              active: true,
              showInSlideshow: true,
            },
            select: {
              id: true,
              imageUrl: true,
              title: true,
            },
          });

          // Sort by the order in parsed IDs
          photoshootImages = parsed
            .map(id => images.find(img => img.id === id))
            .filter((img): img is { id: string; imageUrl: string; title: string | null } => img !== undefined);
        }
      }
    } catch (error) {
      console.error('Failed to load photoshoot images:', error);
    }
  }

  const lockGalleryEnabled = lockHomepage && photoshootImages.length > 0 && (photoshootSlideshow || showPhotoshootGallery);

  // Organization JSON-LD structured data
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Elucid London',
    alternateName: 'Elucid LDN',
    url: 'https://www.elucid.london',
    logo: 'https://www.elucid.london/icon.png',
    description: 'Contemporary streetwear crafted in London',
    email: 'Elucid.Ldn@gmail.com',
    sameAs: [
      'https://www.instagram.com/elucid.ldn',
      'https://www.tiktok.com/@elucid.ldn6',
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'London',
      addressCountry: 'GB',
    },
  };

  return (
    <main>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <Suspense fallback={<div className="h-20" />}>
        <Navigation locked={lockHomepage} isAdmin={!!isAdmin} />
      </Suspense>
      <Hero locked={lockHomepage} isAdmin={!!isAdmin} />
      {!lockHomepage && (
        <>
          <WritingSection />
          <Featured />
          {showPhotoshootGallery && photoshootImages.length > 0 && (
            <PhotoshootGallery
              images={photoshootImages}
              enableSlideshow={photoshootSlideshow}
              title={galleryTitle}
              subtitle={gallerySubtitle}
              showImageTitles={galleryShowTitles}
            />
          )}
          {showFeedbackSection && <Reviews />}
          <Newsletter />
          <Footer />
        </>
      )}
      {lockHomepage && lockGalleryEnabled && (
        <PhotoshootGallery
          images={photoshootImages}
          enableSlideshow={photoshootSlideshow || lockHomepage}
          title={galleryTitle}
          subtitle={gallerySubtitle}
          showImageTitles={galleryShowTitles}
        />
      )}
    </main>
  );
}
