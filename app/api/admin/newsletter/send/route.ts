import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

const sendNewsletterSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, id: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validation = sendNewsletterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { subject, content } = validation.data;

    // Get all active, verified subscribers
    const subscribers = await prisma.newsletter.findMany({
      where: {
        active: true,
        verified: true,
      },
      select: { email: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No active subscribers to send to" },
        { status: 400 }
      );
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send newsletter to all subscribers
    const emailPromises = subscribers.map((subscriber) =>
      resend.emails.send({
        from: "Elucid LDN <noreply@elucid.uk>",
        to: subscriber.email,
        subject: subject,
        html: content,
      })
    );

    // Wait for all emails to send
    await Promise.all(emailPromises);

    // Store newsletter record
    await prisma.newsletterEmail.create({
      data: {
        subject,
        content,
        sentCount: subscribers.length,
        sentBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      sentCount: subscribers.length,
    });
  } catch (error) {
    console.error("Error sending newsletter:", error);
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    );
  }
}
