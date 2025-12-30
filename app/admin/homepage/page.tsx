import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import WritingSectionEditor from "@/components/WritingSectionEditor";
import SingleImageUploader from "@/components/admin/SingleImageUploader";

export const dynamic = "force-dynamic";

function toDatetimeLocalValue(date?: Date | null): string {
  if (!date) return "";
  const iso = date.toISOString();
  return iso.slice(0, 16);
}

async function updateHomepageSettingsAction(formData: FormData) {
  "use server";

  const existingConfig = await prisma.homepageConfig.findUnique({
    where: { id: "main" },
  });

  const normalizeText = (value: FormDataEntryValue | null | undefined) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.toString().trim();
    return trimmed === "" ? null : trimmed;
  };

  const normalizeRichText = (value: FormDataEntryValue | null | undefined) => {
    if (value === null || value === undefined) return null;
    const raw = value.toString();
    return raw.trim() === "" ? null : raw;
  };

  const formContext = formData.get("formContext")?.toString() ?? null;

  const includesHeroFields =
    formContext === "hero" ||
    ["heroHeading", "heroSubheading", "customContent", "heroCtaLabel", "heroCtaHref", "featuredCollectionId", "showCountdown", "countdownLabel", "countdownTarget", "heroImageUrl", "useCustomHeroImage"].some((field) =>
      formData.has(field)
    );
  const includesFeaturedFields =
    formContext === "featured" ||
    ["featuredTitle", "featuredSubtitle", "featuredDescription"].some((field) =>
      formData.has(field)
    );
  const includesWritingFields =
    formContext === "writing" || formData.has("writingSection");
  const includesPurchasingFields =
    formContext === "purchasing" ||
    ["purchasingEnabled", "faviconUrl", "lockHomepage"].some((field) => formData.has(field));

  const heroHeading = includesHeroFields
    ? normalizeText(formData.get("heroHeading"))
    : existingConfig?.heroHeading ?? null;
  const heroSubheading = includesHeroFields
    ? normalizeText(formData.get("heroSubheading"))
    : existingConfig?.heroSubheading ?? null;
  const customContent = includesHeroFields
    ? normalizeText(formData.get("customContent"))
    : existingConfig?.customContent ?? null;
  const heroCtaLabel = includesHeroFields
    ? normalizeText(formData.get("heroCtaLabel"))
    : existingConfig?.heroCtaLabel ?? null;
  const heroCtaHref = includesHeroFields
    ? normalizeText(formData.get("heroCtaHref"))
    : existingConfig?.heroCtaHref ?? null;
  const heroImageUrl = includesHeroFields
    ? normalizeText(formData.get("heroImageUrl"))
    : existingConfig?.heroImageUrl ?? null;
  let useCustomHeroImage = includesHeroFields
    ? formData.get("useCustomHeroImage") === "on"
    : existingConfig?.useCustomHeroImage ?? false;

  // Auto-enable custom hero images when a new image is provided
  if (includesHeroFields && heroImageUrl && !useCustomHeroImage) {
    useCustomHeroImage = true;
  }
  const featuredCollectionId = includesHeroFields
    ? normalizeText(formData.get("featuredCollectionId"))
    : existingConfig?.featuredCollectionId ?? null;

  const featuredTitle = includesFeaturedFields
    ? normalizeText(formData.get("featuredTitle"))
    : existingConfig?.featuredTitle ?? null;
  const featuredSubtitle = includesFeaturedFields
    ? normalizeText(formData.get("featuredSubtitle"))
    : existingConfig?.featuredSubtitle ?? null;
  const featuredDescription = includesFeaturedFields
    ? normalizeText(formData.get("featuredDescription"))
    : existingConfig?.featuredDescription ?? null;

  const writingSection = includesWritingFields
    ? normalizeRichText(formData.get("writingSection"))
    : existingConfig?.writingSection ?? null;

  const purchasingEnabled = includesPurchasingFields
    ? formData.get("purchasingEnabled") === "on"
    : existingConfig?.purchasingEnabled ?? true;

  const showFeedbackSection = includesPurchasingFields
    ? formData.get("showFeedbackSection") === "on"
    : existingConfig?.showFeedbackSection ?? false;

  const showFeedbackButton = includesPurchasingFields
    ? formData.get("showFeedbackButton") === "on"
    : existingConfig?.showFeedbackButton ?? false;

  const rotateHomepageReviews = includesPurchasingFields
    ? formData.get("rotateHomepageReviews") === "on"
    : existingConfig?.rotateHomepageReviews ?? false;

  const autoDeductStock = includesPurchasingFields
    ? formData.get("autoDeductStock") === "on"
    : existingConfig?.autoDeductStock ?? false;

  const footerTagline = includesPurchasingFields
    ? normalizeText(formData.get("footerTagline"))
    : existingConfig?.footerTagline ?? "Made in London";

  const guestCheckoutEnabled = includesPurchasingFields
    ? formData.get("guestCheckoutEnabled") === "on"
    : existingConfig?.guestCheckoutEnabled ?? false;

  const shippingEmailsEnabled = includesPurchasingFields
    ? formData.get("shippingEmailsEnabled") === "on"
    : existingConfig?.shippingEmailsEnabled ?? false;

  const lockHomepage = includesPurchasingFields
    ? formData.get("lockHomepage") === "on"
    : existingConfig?.lockHomepage ?? false;

  const faviconUrl = includesPurchasingFields
    ? normalizeText(formData.get("faviconUrl"))
    : existingConfig?.faviconUrl ?? null;

  const showCountdown = includesHeroFields
    ? formData.get("showCountdown") === "on"
    : existingConfig?.showCountdown ?? false;

  let countdownLabel = includesHeroFields
    ? normalizeText(formData.get("countdownLabel"))
    : existingConfig?.countdownLabel ?? null;

  let countdownTarget: Date | null;
  if (includesHeroFields) {
    const countdownTargetRaw = normalizeText(formData.get("countdownTarget"));
    if (countdownTargetRaw) {
      const parsed = new Date(countdownTargetRaw);
      countdownTarget = Number.isNaN(parsed.getTime()) ? null : parsed;
    } else {
      countdownTarget = null;
    }
  } else {
    countdownTarget = existingConfig?.countdownTarget ?? null;
  }

  if (!showCountdown) {
    countdownLabel = null;
    countdownTarget = null;
  }

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
      heroImageUrl,
      useCustomHeroImage,
      showCountdown,
      countdownLabel,
      countdownTarget,
      featuredCollectionId,
      featuredTitle,
      featuredSubtitle,
      featuredDescription,
      writingSection,
      purchasingEnabled,
      showFeedbackSection,
      showFeedbackButton,
      rotateHomepageReviews,
      autoDeductStock,
      footerTagline,
      guestCheckoutEnabled,
      shippingEmailsEnabled,
      faviconUrl,
      lockHomepage,
    },
    create: {
      id: "main",
      heroHeading,
      heroSubheading,
      customContent,
      heroCtaLabel,
      heroCtaHref: finalCtaHref,
      heroImageUrl,
      useCustomHeroImage,
      showCountdown,
      countdownLabel,
      countdownTarget,
      featuredCollectionId,
      featuredTitle,
      featuredSubtitle,
      featuredDescription,
      writingSection,
      purchasingEnabled,
      showFeedbackSection,
      showFeedbackButton,
      rotateHomepageReviews,
      autoDeductStock,
      footerTagline,
      guestCheckoutEnabled,
      shippingEmailsEnabled,
      faviconUrl,
      lockHomepage,
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
            <input type="hidden" name="formContext" value="hero" />
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

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                Hero Image
              </legend>
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  name="useCustomHeroImage"
                  defaultChecked={homepageConfig?.useCustomHeroImage ?? false}
                  className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                Use custom hero image instead of default logo
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  Custom Hero Image
                </label>
                <SingleImageUploader
                  currentImageUrl={homepageConfig?.heroImageUrl}
                  fieldName="heroImageUrl"
                  folder="hero"
                  acceptedFormats="PNG, JPG, WebP, SVG"
                  allowSvg
                />
                <p className="mt-1 text-xs text-charcoal/60">
                  Upload an image to use as your custom hero image. SVG logos are automatically converted to white for the dark hero background.
                </p>
              </div>
            </fieldset>

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
            <input type="hidden" name="formContext" value="featured" />
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
            <input type="hidden" name="formContext" value="writing" />
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

        <section className="mt-8 space-y-6 rounded-2xl border border-charcoal/10 bg-cream p-6">
          <header>
            <h2 className="text-xl font-semibold text-charcoal">Site Settings</h2>
            <p className="text-sm text-charcoal/70">
              Manage global site-wide settings and functionality.
            </p>
          </header>

          <form action={updateHomepageSettingsAction} className="space-y-5">
            <input type="hidden" name="formContext" value="purchasing" />

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                Site Lockdown
              </legend>
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  name="lockHomepage"
                  defaultChecked={homepageConfig?.lockHomepage ?? false}
                  className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                Lock site to countdown and hero imagery only
              </label>
              <p className="text-xs text-charcoal/60">
                Hides shop and content sections for visitors, showing only the hero with countdown. Admins will still be able to access the dashboard at /admin.
              </p>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                Purchasing
              </legend>
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  name="purchasingEnabled"
                  defaultChecked={homepageConfig?.purchasingEnabled ?? true}
                  className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                Enable purchasing site-wide
              </label>
              <p className="text-xs text-charcoal/60">
                When disabled, customers will not be able to add items to cart or make purchases. Use this for maintenance or when you need to temporarily disable sales.
              </p>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                Inventory
              </legend>
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  name="autoDeductStock"
                  defaultChecked={homepageConfig?.autoDeductStock ?? false}
                  className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                Reserve stock automatically when orders are placed
              </label>
              <p className="text-xs text-charcoal/60">
                When enabled, product stock will be moved to "Reserved" when customers place orders (online and in-person). When disabled, stock will be automatically deducted from available inventory.
              </p>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                Feedback
              </legend>
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  name="showFeedbackButton"
                  defaultChecked={homepageConfig?.showFeedbackButton ?? false}
                  className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                Show "Share Feedback" button on hero section
              </label>
              <p className="text-xs text-charcoal/60">
                When enabled, a "Share Feedback" button will appear below the main CTA on the homepage hero section.
              </p>

              <div className="pt-2 border-t border-charcoal/5">
                <label className="flex items-center gap-3 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    name="showFeedbackSection"
                    defaultChecked={homepageConfig?.showFeedbackSection ?? false}
                    className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  Show customer feedback section on homepage
                </label>
                <p className="text-xs text-charcoal/60 mt-1">
                  When enabled, the homepage will display pinned customer reviews and feedback. The section will only appear if there are approved and pinned reviews.
                </p>
              </div>

              <div className="pt-2 border-t border-charcoal/5">
                <label className="flex items-center gap-3 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    name="rotateHomepageReviews"
                    defaultChecked={homepageConfig?.rotateHomepageReviews ?? false}
                    className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  Enable rotating reviews carousel (max 3 reviews at a time)
                </label>
                <p className="text-xs text-charcoal/60 mt-1">
                  When enabled and more than 3 reviews are pinned, reviews will automatically rotate in a carousel every 5 seconds. Users can also manually navigate with dots.
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                Footer
              </legend>
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  Footer Tagline
                </label>
                <input
                  type="text"
                  name="footerTagline"
                  defaultValue={homepageConfig?.footerTagline ?? "Made in London"}
                  placeholder="e.g., Made in London"
                  className="input-modern w-full"
                />
                <p className="text-xs text-charcoal/60 mt-1">
                  This text appears in the footer of your website. Leave blank to hide.
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                Branding
              </legend>
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  Custom Favicon
                </label>
                <SingleImageUploader
                  currentImageUrl={homepageConfig?.faviconUrl}
                  fieldName="faviconUrl"
                  folder="branding"
                  maxHeight="h-16 w-16"
                  acceptedFormats="PNG, ICO (16x16 or 32x32)"
                  maxSizeText="1MB"
                />
                <p className="text-xs text-charcoal/60 mt-1">
                  Upload your custom favicon (the small icon that appears in browser tabs). Recommended size: 32x32 or 16x16 pixels.
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-charcoal/10 bg-white px-5 py-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-charcoal/70">
                E-commerce Features
              </legend>
              <label className="flex items-center gap-3 text-sm text-charcoal">
                <input
                  type="checkbox"
                  name="guestCheckoutEnabled"
                  defaultChecked={homepageConfig?.guestCheckoutEnabled ?? false}
                  className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                Enable guest checkout
              </label>
              <p className="text-xs text-charcoal/60">
                Allow customers to checkout without creating an account. Note: The checkout UI will still encourage account creation.
              </p>

              <div className="pt-2 border-t border-charcoal/5">
                <label className="flex items-center gap-3 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    name="shippingEmailsEnabled"
                    defaultChecked={homepageConfig?.shippingEmailsEnabled ?? false}
                    className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  Send shipping confirmation emails
                </label>
                <p className="text-xs text-charcoal/60 mt-1">
                  Automatically send email notifications when orders are shipped with tracking information.
                </p>
              </div>
            </fieldset>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="submit"
                className="px-7 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
              >
                Save settings
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
