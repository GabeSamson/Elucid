import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.homepageConfig.findUnique({
      where: { id: "main" },
    });

    return NextResponse.json({ config: config || {} });
  } catch (error) {
    console.error("Error fetching homepage config:", error);
    return NextResponse.json(
      { error: "Failed to fetch homepage config" },
      { status: 500 }
    );
  }
}
