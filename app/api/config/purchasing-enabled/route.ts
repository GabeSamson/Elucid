import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.homepageConfig.findUnique({
      where: { id: "main" },
      select: { purchasingEnabled: true },
    });

    return NextResponse.json({
      purchasingEnabled: config?.purchasingEnabled ?? true,
    });
  } catch (error) {
    console.error("Error fetching purchasing config:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchasing configuration" },
      { status: 500 }
    );
  }
}
