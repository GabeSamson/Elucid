import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WritingSection from "@/components/WritingSection";
import Featured from "@/components/Featured";
import Reviews from "@/components/Reviews";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const config = await prisma.homepageConfig.findUnique({
    where: { id: "main" },
  });

  const showFeedbackSection = config?.showFeedbackSection ?? false;

  return (
    <main>
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>
      <Hero />
      <WritingSection />
      <Featured />
      {showFeedbackSection && <Reviews />}
      <Newsletter />
      <Footer />
    </main>
  );
}
