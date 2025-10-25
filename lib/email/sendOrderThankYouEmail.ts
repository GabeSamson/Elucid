import { Resend } from 'resend';

const DEFAULT_FROM_ADDRESS = 'Elucid LDN <hello@elucid.london>';

interface SendOrderThankYouEmailOptions {
  to: string;
  name?: string | null;
}

export async function sendOrderThankYouEmail({
  to,
  name,
}: SendOrderThankYouEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set; skipping thank-you email.');
    return;
  }

  const normalizedRecipient = to?.trim();
  if (!normalizedRecipient) {
    console.warn('No recipient email provided; skipping thank-you email.');
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const firstName = name?.trim() || 'there';
    const subject = 'Thank you for your purchase from Elucid LDN';
    const textBody = [
      `Hi ${firstName},`,
      '',
      'Thank you for your purchase from Elucid LDN. We appreciate your support!',
      'We will let you know as soon as your order is on its way.',
      '',
      '— The Elucid LDN Team',
    ].join('\n');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #2B2826; line-height: 1.6; max-width: 520px; margin: 0 auto;">
        <h1 style="font-size: 22px; margin-bottom: 16px;">Thank you for your purchase</h1>
        <p style="margin-bottom: 12px;">Hi ${firstName},</p>
        <p style="margin-bottom: 12px;">
          Thank you for your purchase from <strong>Elucid LDN</strong>. We appreciate your support!
        </p>
        <p style="margin-bottom: 20px;">
          We'll email you again as soon as your order is on its way.
        </p>
        <p style="margin-bottom: 0;">— The Elucid LDN Team</p>
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
    console.error('Failed to send thank-you email:', error);
  }
}
