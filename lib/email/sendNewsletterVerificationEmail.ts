import { Resend } from 'resend';

const DEFAULT_FROM_ADDRESS = 'Elucid LDN <hello@elucid.london>';

interface SendNewsletterVerificationEmailOptions {
  to: string;
  verificationToken: string;
}

export async function sendNewsletterVerificationEmail({
  to,
  verificationToken,
}: SendNewsletterVerificationEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set; skipping verification email.');
    return;
  }

  const normalizedRecipient = to?.trim();
  if (!normalizedRecipient) {
    console.warn('No recipient email provided; skipping verification email.');
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/newsletter/verify/${verificationToken}`;

    const subject = 'Confirm your newsletter subscription';
    const textBody = [
      'Thank you for subscribing to the Elucid LDN newsletter!',
      '',
      'Please confirm your subscription by clicking the link below:',
      verificationUrl,
      '',
      'If you did not request this subscription, you can safely ignore this email.',
      '',
      '— The Elucid LDN Team',
    ].join('\n');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #2B2826; line-height: 1.6; max-width: 520px; margin: 0 auto;">
        <h1 style="font-size: 22px; margin-bottom: 16px;">Confirm your newsletter subscription</h1>
        <p style="margin-bottom: 12px;">
          Thank you for subscribing to the <strong>Elucid LDN</strong> newsletter!
        </p>
        <p style="margin-bottom: 20px;">
          Please confirm your subscription by clicking the button below:
        </p>
        <div style="margin: 32px 0;">
          <a href="${verificationUrl}" style="background-color: #2B2826; color: #F5F3EE; padding: 14px 32px; text-decoration: none; display: inline-block; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">
            Confirm Subscription
          </a>
        </div>
        <p style="margin-bottom: 12px; font-size: 13px; color: #6B6560;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="margin-bottom: 20px; font-size: 13px; word-break: break-all; color: #6B6560;">
          ${verificationUrl}
        </p>
        <p style="margin-bottom: 0; font-size: 13px; color: #6B6560;">
          If you did not request this subscription, you can safely ignore this email.
        </p>
        <p style="margin-top: 20px;">— The Elucid LDN Team</p>
      </div>
    `;

    await resend.emails.send({
      from: DEFAULT_FROM_ADDRESS,
      to: normalizedRecipient,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }
}
