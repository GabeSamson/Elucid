import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

const sendNewsletterSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  includeAllUsers: z.boolean().optional().default(false),
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

    if (user?.role?.toUpperCase() !== "ADMIN") {
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

    const { subject, content, includeAllUsers } = validation.data;

    // Get recipients based on includeAllUsers flag
    let recipients: { email: string }[] = [];

    if (includeAllUsers) {
      // Get all users with verified emails
      const users = await prisma.user.findMany({
        where: {
          emailVerified: true,
        },
        select: { email: true },
      });

      // Also get newsletter subscribers
      const newsletterSubscribers = await prisma.newsletter.findMany({
        where: {
          active: true,
          verified: true,
        },
        select: { email: true },
      });

      // Combine and deduplicate emails
      const emailSet = new Set<string>();
      users.forEach(u => emailSet.add(u.email));
      newsletterSubscribers.forEach(s => emailSet.add(s.email));

      recipients = Array.from(emailSet).map(email => ({ email }));
    } else {
      // Get only active, verified newsletter subscribers
      recipients = await prisma.newsletter.findMany({
        where: {
          active: true,
          verified: true,
        },
        select: { email: true },
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients to send to" },
        { status: 400 }
      );
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send newsletter to all recipients with rate limiting
    // Resend free tier: 2 emails per second, so we send in batches with delays
    const results = [];
    const batchSize = 2;
    const delayMs = 1100; // Slightly over 1 second to be safe

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await resend.emails.send({
            from: "Elucid LDN <hello@elucid.london>",
            to: recipient.email,
            subject: subject,
            html: content,
          });
          console.log(`Newsletter sent to ${recipient.email}:`, result);
          return result;
        } catch (error) {
          console.error(`Failed to send newsletter to ${recipient.email}:`, error);
          throw error;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < recipients.length) {
        console.log(`Sent batch ${Math.floor(i / batchSize) + 1}, waiting ${delayMs}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log(`Successfully sent ${results.length} newsletters`);

    // Store newsletter record
    await prisma.newsletterEmail.create({
      data: {
        subject,
        content,
        sentCount: recipients.length,
        sentBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      sentCount: recipients.length,
    });
  } catch (error) {
    console.error("Error sending newsletter:", error);
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    );
  }
}
