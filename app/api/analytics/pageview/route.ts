import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, referrer, utmSource, utmMedium, utmCampaign } = body;

    // Get country from IP (optional - can use a geolocation service)
    // For now, we'll leave country as null, but you could integrate ipapi.co here
    let country: string | null = null;

    // Optional: Detect country from IP using request headers
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    if (ip) {
      try {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/country_code/`, {
          signal: AbortSignal.timeout(2000),
        });
        if (geoResponse.ok) {
          country = await geoResponse.text();
        }
      } catch (error) {
        // Silently fail geolocation
        console.error("Geolocation failed:", error);
      }
    }

    const userAgent = request.headers.get("user-agent") || "unknown";
    const now = new Date();
    const dayKey = now.toISOString().split("T")[0];

    const hashInput = `${ip || "anonymous"}|${userAgent}`;
    const visitorHash = createHash("sha256").update(hashInput).digest("hex");
    const sessionHash = createHash("sha256")
      .update(`${hashInput}|${dayKey}`)
      .digest("hex");

    // Store page view in database
    await prisma.pageView.create({
      data: {
        path: path || "/",
        referrer: referrer || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        country: country || null,
        userAgent,
        visitorHash,
        sessionHash,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error storing page view:", error);
    return NextResponse.json(
      { error: "Failed to store page view" },
      { status: 500 }
    );
  }
}
