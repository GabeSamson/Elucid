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
  const config = await prisma.homepageConfig.findUnique({
    where: { id: "main" },
  });

  const showFeedbackSection = config?.showFeedbackSection ?? false;
  const showPhotoshootGallery = config?.showPhotoshootGallery ?? false;

  let photoshootImages: string[] = [];
  if (showPhotoshootGallery && config?.photoshootImages) {
    try {
      const parsed = JSON.parse(config.photoshootImages);
      if (Array.isArray(parsed)) {
        photoshootImages = parsed.filter((img): img is string => typeof img === 'string');
      }
    } catch (error) {
      console.error('Failed to parse photoshoot images:', error);
    }
  }

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
        <Navigation />
      </Suspense>
      <Hero />
      <WritingSection />
      <Featured />
      {showPhotoshootGallery && photoshootImages.length > 0 && (
        <PhotoshootGallery images={photoshootImages} />
      )}
      {showFeedbackSection && <Reviews />}
      <Newsletter />
      <Footer />
    </main>
  );
}
