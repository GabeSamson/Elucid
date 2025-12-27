import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WritingSection from "@/components/WritingSection";
import Featured from "@/components/Featured";
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
  const lockHomepage = config?.lockHomepage ?? false;

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
      {lockHomepage ? null : (
        <>
          <WritingSection />
          <Featured />
          {showFeedbackSection && <Reviews />}
          <Newsletter />
          <Footer />
        </>
      )}
    </main>
  );
}
