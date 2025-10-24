import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import WritingSectionEditor from "@/components/WritingSectionEditor";

export const dynamic = "force-dynamic";

function toDatetimeLocalValue(date?: Date | null): string {
  if (!date) return "";
  const iso = date.toISOString();
  return iso.slice(0, 16);
}

async function updateHomepageSettingsAction(formData: FormData) {
  "use server";

  const heroHeading = formData.get("heroHeading")?.toString().trim() || null;
  const heroSubheading = formData.get("heroSubheading")?.toString().trim() || null;
  const customContent = formData.get("customContent")?.toString().trim() || null;
  const heroCtaLabel = formData.get("heroCtaLabel")?.toString().trim() || null;
  const heroCtaHref = formData.get("heroCtaHref")?.toString().trim() || null;
  const featuredCollectionId = formData.get("featuredCollectionId")?.toString().trim() || null;

  const featuredTitle = formData.get("featuredTitle")?.toString().trim() || null;
  const featuredSubtitle = formData.get("featuredSubtitle")?.toString().trim() || null;
  const featuredDescription = formData.get("featuredDescription")?.toString().trim() || null;
  const writingSection = formData.get("writingSection")?.toString().trim() || null;

  const showCountdown = formData.get("showCountdown") === "on";
  const countdownLabel = showCountdown
    ? formData.get("countdownLabel")?.toString().trim() || null
    : null;
  const countdownTargetRaw = showCountdown
    ? formData.get("countdownTarget")?.toString().trim()
    : null;
  const countdownTarget = countdownTargetRaw ? new Date(countdownTargetRaw) : null;

  let finalCtaHref = heroCtaHref || null;
  if (featuredCollectionId) {
    const featured = await prisma.collection.findUnique({
      where: { id: featuredCollectionId },
      select: { slug: true },
    });

    if (featured) {
      finalCtaHref = `/collections/${featured.slug}`;
    }
  }

  await prisma.homepageConfig.upsert({
    where: { id: "main" },
    update: {
      heroHeading,
      heroSubheading,
      customContent,
      heroCtaLabel,
      heroCtaHref: finalCtaHref,
      showCountdown,
      countdownLabel,
      countdownTarget,
      featuredCollectionId,
      featuredTitle,
      featuredSubtitle,
      featuredDescription,
      writingSection,
    },
    create: {
      id: "main",
      heroHeading,
      heroSubheading,
      customContent,
      heroCtaLabel,
      heroCtaHref: finalCtaHref,
      showCountdown,
      countdownLabel,
      countdownTarget,
      featuredCollectionId,
      featuredTitle,
      featuredSubtitle,
      featuredDescription,
      writingSection,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  revalidatePath("/shop");

  redirect("/admin/homepage?success=homepage-updated");
}

interface AdminHomepagePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminHomepagePage({ searchParams }: AdminHomepagePageProps) {
  noStore();

  const [collections, homepageConfig] = await Promise.all([
    prisma.collection.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.homepageConfig.findUnique({
      where: { id: "main" },
      include: { featuredCollection: true },
    }),
  ]);

  const resolvedSearchParams = await searchParams;
  const success = typeof resolvedSearchParams?.success === "string" ? resolvedSearchParams?.success : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl text-charcoal-dark">Homepage</h1>
        <p className="text-charcoal/70">
          Configure the hero section and homepage content.
        </p>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success === "homepage-updated" && "Homepage settings saved."}
        </div>
      )}

      <div className="max-w-4xl">
        <section className="space-y-6 rounded-2xl border border-charcoal/10 bg-cream p-6">
          <header>
            <h2 className="text-xl font-semibold text-charcoal">Hero Section</h2>
            <p className="text-sm text-charcoal/70">
              Customize the main message visitors see when they land on your site.
            </p>
          </header>

          <form action={updateHomepageSettingsAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">Headline</label>
                <input
                  name="heroHeading"
                  defaultValue={homepageConfig?.heroHeading ?? ""}
                  placeholder="Main hero headline text"
                  className="input-modern"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  Subheadline
                </label>
                <input
                  name="heroSubheading"
                  defaultValue={homepageConfig?.heroSubheading ?? ""}
                  placeholder="Optional secondary text below headline"
                  className="input-modern"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">
                Supporting copy
              </label>
              <textarea
                name="customContent"
                defaultValue={homepageConfig?.customContent ?? ""}
                placeholder="Additional descriptive text or messaging for the hero section"
                className="input-modern min-h-[120px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  CTA label
                </label>
                <input
                  name="heroCtaLabel"
                  defaultValue={homepageConfig?.heroCtaLabel ?? ""}
                  placeholder="Text for the call-to-action button"
                  className="input-modern"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  CTA link override
                </label>
                <input
                  name="heroCtaHref"
                  defaultValue={homepageConfig?.heroCtaHref ?? ""}
                  placeholder="Custom URL path for the button"
                  className="input-modern"
                />
                <p className="mt-1 text-xs text-charcoal/60">
                  Selecting a featured collection below will override this link.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  Featured collection
                </label>
                <select
                  name="featuredCollectionId"
                  defaultValue={homepageConfig?.featuredCollectionId ?? ""}
                  className="select-modern"
                >
                  <option value="">None</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-sm text-charcoal/70">
                <p>
                  Featured collections automatically set the CTA destination to the selected
                  collection page.
                </p>
              </div>
            </div>

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                Countdown
              </legend>
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  name="showCountdown"
                  defaultChecked={homepageConfig?.showCountdown ?? false}
                  className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                Enable countdown timer
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-charcoal">
                    Countdown label
                  </label>
                  <input
                    name="countdownLabel"
                    defaultValue={homepageConfig?.countdownLabel ?? ""}
                    placeholder="Text displayed above the countdown timer"
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-charcoal">
                    Target date &amp; time
                  </label>
                  <input
                    type="datetime-local"
                    name="countdownTarget"
                    defaultValue={toDatetimeLocalValue(homepageConfig?.countdownTarget ?? null)}
                    placeholder="End date/time for countdown"
                    className="input-modern"
                  />
                </div>
              </div>

              <p className="text-xs text-charcoal/60">
                Leaving the date empty will hide the timer even if it is enabled.
              </p>
            </fieldset>

            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href="/"
                className="px-6 py-3 border border-charcoal/30 text-charcoal rounded-lg hover:bg-charcoal/5 transition-colors"
              >
                Preview homepage
              </Link>
              <button
                type="submit"
                className="px-7 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
              >
                Save homepage
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 space-y-6 rounded-2xl border border-charcoal/10 bg-cream p-6">
          <header>
            <h2 className="text-xl font-semibold text-charcoal">Featured Section</h2>
            <p className="text-sm text-charcoal/70">
              Customize the text content displayed in the featured products section.
            </p>
          </header>

          <form action={updateHomepageSettingsAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">Title</label>
                <input
                  name="featuredTitle"
                  defaultValue={homepageConfig?.featuredTitle ?? ""}
                  placeholder="Featured section title (e.g., 'Featured')"
                  className="input-modern"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  Subtitle
                </label>
                <input
                  name="featuredSubtitle"
                  defaultValue={homepageConfig?.featuredSubtitle ?? ""}
                  placeholder="Optional subtitle for the featured section"
                  className="input-modern"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">
                Description
              </label>
              <textarea
                name="featuredDescription"
                defaultValue={homepageConfig?.featuredDescription ?? ""}
                placeholder="Additional descriptive text for the featured section"
                className="input-modern min-h-[120px]"
              />
            </div>

            <p className="text-xs text-charcoal/60">
              Note: Featured products are managed through the Products page by marking products as featured.
            </p>

            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href="/"
                className="px-6 py-3 border border-charcoal/30 text-charcoal rounded-lg hover:bg-charcoal/5 transition-colors"
              >
                Preview homepage
              </Link>
              <button
                type="submit"
                className="px-7 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
              >
                Save homepage
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 space-y-6 rounded-2xl border border-charcoal/10 bg-cream p-6">
          <header>
            <h2 className="text-xl font-semibold text-charcoal">Writing Section</h2>
            <p className="text-sm text-charcoal/70">
              Add a custom writing section with rich text formatting that appears between the hero and featured products.
            </p>
          </header>

          <form action={updateHomepageSettingsAction} className="space-y-5">
            <WritingSectionEditor initialContent={homepageConfig?.writingSection ?? null} />

            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href="/"
                className="px-6 py-3 border border-charcoal/30 text-charcoal rounded-lg hover:bg-charcoal/5 transition-colors"
              >
                Preview homepage
              </Link>
              <button
                type="submit"
                className="px-7 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
              >
                Save writing section
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
