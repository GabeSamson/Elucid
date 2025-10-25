import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WritingSection from "@/components/WritingSection";
import Featured from "@/components/Featured";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>
      <Hero />
      <WritingSection />
      <Featured />
      <Newsletter />
      <Footer />
    </main>
  );
}
