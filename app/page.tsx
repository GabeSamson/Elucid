import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WritingSection from "@/components/WritingSection";
import Featured from "@/components/Featured";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />
      <WritingSection />
      <Featured />
      <Newsletter />
      <Footer />
    </main>
  );
}
