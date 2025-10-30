import { Resend } from 'resend';

const DEFAULT_FROM_ADDRESS = 'Elucid LDN <hello@elucid.london>';

interface OrderItem {
  productName: string;
  quantity: number;
  size?: string | null;
  color?: string | null;
  priceAtPurchase: number;
}

interface SendOrderThankYouEmailOptions {
  to: string;
  name?: string | null;
  items?: OrderItem[];
  total?: number;
}

export async function sendOrderThankYouEmail({
  to,
  name,
  items = [],
  total,
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

    // Format items for text email
    const itemsText = items.length > 0
      ? '\n\nYour order:\n' + items.map(item => {
          const variant = [item.size, item.color].filter(Boolean).join(', ');
          const variantText = variant ? ` (${variant})` : '';
          return `- ${item.productName}${variantText} x ${item.quantity} - £${item.priceAtPurchase.toFixed(2)}`;
        }).join('\n') + (total ? `\n\nTotal: £${total.toFixed(2)}` : '')
      : '';

    const textBody = [
      `Hi ${firstName},`,
      '',
      'Thank you for your purchase from Elucid LDN. We appreciate your support!',
      itemsText,
      '',
      'We will let you know as soon as your order is on its way.',
      '',
      '— The Elucid LDN Team',
    ].join('\n');

    // Format items for HTML email
    const itemsHtml = items.length > 0
      ? `
        <div style="margin: 24px 0; padding: 16px; background-color: #f9f9f9; border-radius: 8px;">
          <h2 style="font-size: 18px; margin-bottom: 12px; margin-top: 0;">Your Order</h2>
          ${items.map(item => {
            const variant = [item.size, item.color].filter(Boolean).join(', ');
            const variantText = variant ? `<span style="color: #666; font-size: 14px;"> (${variant})</span>` : '';
            return `
              <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;">
                <strong>${item.productName}</strong>${variantText}
                <br>
                <span style="color: #666; font-size: 14px;">Quantity: ${item.quantity} × £${item.priceAtPurchase.toFixed(2)}</span>
              </div>
            `;
          }).join('')}
          ${total ? `
            <div style="margin-top: 12px; padding-top: 8px; border-top: 2px solid #2B2826; font-size: 16px;">
              <strong>Total: £${total.toFixed(2)}</strong>
            </div>
          ` : ''}
        </div>
      `
      : '';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #2B2826; line-height: 1.6; max-width: 520px; margin: 0 auto;">
        <h1 style="font-size: 22px; margin-bottom: 16px;">Thank you for your purchase</h1>
        <p style="margin-bottom: 12px;">Hi ${firstName},</p>
        <p style="margin-bottom: 12px;">
          Thank you for your purchase from <strong>Elucid LDN</strong>. We appreciate your support!
        </p>
        ${itemsHtml}
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
