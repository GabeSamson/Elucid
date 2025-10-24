import { prisma } from "@/lib/prisma";

export default async function WritingSection() {
  const homepageConfig = await prisma.homepageConfig.findUnique({
    where: { id: "main" },
  });

  if (!homepageConfig?.writingSection) {
    return null;
  }

  return (
    <section className="py-20 px-6 bg-cream">
      <div className="max-w-4xl mx-auto">
        <div
          className="prose prose-lg prose-charcoal max-w-none
            prose-headings:font-serif prose-headings:text-charcoal-dark
            prose-p:text-charcoal prose-p:leading-relaxed
            prose-a:text-charcoal-dark prose-a:underline hover:prose-a:text-charcoal
            prose-strong:text-charcoal-dark prose-em:text-charcoal
            prose-blockquote:border-charcoal/30 prose-blockquote:text-charcoal-light
            prose-ul:text-charcoal prose-ol:text-charcoal"
          dangerouslySetInnerHTML={{ __html: homepageConfig.writingSection }}
        />
      </div>
    </section>
  );
}
