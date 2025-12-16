import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MarketingPixels from "@/components/MarketingPixels";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  noStore();

  const config = await prisma.homepageConfig.findUnique({
    where: { id: "main" },
    select: { faviconUrl: true, updatedAt: true },
  });

  const faviconUrl = config?.faviconUrl || "/icon.png";
  const faviconVersion = config?.updatedAt ? config.updatedAt.getTime().toString() : "1";

  const withCacheBuster = (url: string) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${encodeURIComponent(faviconVersion)}`;
  };

  const cacheBustedFaviconUrl = withCacheBuster(faviconUrl);
  const cacheBustedFaviconIcoUrl = withCacheBuster("/favicon.ico");

  return {
    metadataBase: new URL('https://www.elucid.london'),
    title: {
      default: "Elucid London - Modern Streetwear",
      template: "%s | Elucid London"
    },
    description: "Contemporary streetwear crafted in London. Discover our latest collection of modern urban fashion.",
    keywords: ["streetwear", "London fashion", "urban clothing", "modern streetwear", "Elucid", "contemporary fashion"],
    authors: [{ name: "Elucid London" }],
    creator: "Elucid London",
    publisher: "Elucid London",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: [
        { url: cacheBustedFaviconUrl, type: "image/png" },
        { url: cacheBustedFaviconIcoUrl, sizes: "any" },
      ],
      shortcut: cacheBustedFaviconUrl,
      apple: cacheBustedFaviconUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'en_GB',
      url: 'https://www.elucid.london',
      title: 'Elucid London - Modern Streetwear',
      description: 'Contemporary streetwear crafted in London. Discover our latest collection of modern urban fashion.',
      siteName: 'Elucid London',
      images: [
        {
          url: '/icon.png',
          width: 1200,
          height: 630,
          alt: 'Elucid London',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Elucid London - Modern Streetwear',
      description: 'Contemporary streetwear crafted in London. Discover our latest collection of modern urban fashion.',
      images: ['/icon.png'],
      creator: '@elucid.ldn',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      // Add Google Search Console verification here when available
      // google: 'your-verification-code',
    },
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased text-charcoal`}
      >
        <GoogleAnalytics />
        <MarketingPixels />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
