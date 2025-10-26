import HeroClient from "./HeroClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Hero() {

  const config = await prisma.homepageConfig.findUnique({
    where: { id: "main" },
    include: {
      featuredCollection: {
        select: { name: true, slug: true },
      },
    },
  });

  const heading = config?.heroHeading?.trim() || undefined;
  const subheading = config?.heroSubheading ?? null;
  const customContent = config?.customContent ?? null;

  const featuredCollection = config?.featuredCollection;

  const ctaLabel =
    config?.heroCtaLabel ??
    (featuredCollection ? `Shop ${featuredCollection.name}` : "Shop Collection");

  const ctaHref = featuredCollection
    ? `/collections/${featuredCollection.slug}`
    : config?.heroCtaHref ?? "/shop";

  return (
    <HeroClient
      heading={heading}
      subheading={subheading}
      customContent={customContent}
      ctaLabel={ctaLabel}
      ctaHref={ctaHref}
      showCountdown={config?.showCountdown ?? false}
      countdownLabel={config?.countdownLabel}
      countdownTarget={config?.countdownTarget?.toISOString()}
    />
  );
}
