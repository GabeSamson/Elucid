import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { randomBytes } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    try {
      const result = await resend.emails.send({
        from: 'Elucid LDN <hello@elucid.london>',
        to: user.email,
        subject: 'Reset Your Password - Elucid LDN',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2B2826; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>
            <p style="color: #6B6560; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              You requested to reset your password for your Elucid LDN account. Click the button below to set a new password:
            </p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #2B2826; color: #F5F3EE; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px; margin-bottom: 20px;">
              Reset Password
            </a>
            <p style="color: #6B6560; font-size: 14px; line-height: 1.5; margin-bottom: 10px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #2B2826; font-size: 14px; word-break: break-all; margin-bottom: 20px;">
              ${resetUrl}
            </p>
            <p style="color: #6B6560; font-size: 14px; line-height: 1.5;">
              This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #D4C9BA; margin: 30px 0;" />
            <p style="color: #6B6560; font-size: 12px; text-align: center;">
              Elucid LDN - London Streetwear
            </p>
          </div>
        `,
      });
      console.log('Password reset email sent successfully:', result);
    } catch (emailError) {
      console.error('FAILED TO SEND RESET EMAIL:', emailError);
      console.error('Error details:', JSON.stringify(emailError, null, 2));
      // Don't fail the request if email fails (prevents user enumeration)
    }

    return NextResponse.json({
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
