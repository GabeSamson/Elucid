import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const shippingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(2).max(2),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = shippingAddressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid address data" },
        { status: 400 }
      );
    }

    const addressData = validation.data;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        shippingAddress: JSON.stringify(addressData),
      },
    });

    return NextResponse.json({
      message: "Shipping address saved",
    });
  } catch (error) {
    console.error("Error saving shipping address:", error);
    return NextResponse.json(
      { error: "Failed to save shipping address" },
      { status: 500 }
    );
  }
}
