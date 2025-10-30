import { Resend } from 'resend';

const DEFAULT_FROM_ADDRESS = 'Elucid LDN <hello@elucid.london>';

interface OrderItem {
  productName: string;
  productImage?: string | null;
  quantity: number;
  size?: string | null;
  color?: string | null;
  priceAtPurchase: number;
}

interface SendOrderThankYouEmailOptions {
  to: string;
  name?: string | null;
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  total: number;
}

export async function sendOrderThankYouEmail({
  to,
  name,
  orderId,
  items,
  subtotal,
  shipping,
  tax,
  discount,
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
    const subject = `Order Confirmation - ${orderId}`;

    // Generate items text
    const itemsText = items.map(item => {
      const specs = [
        item.size ? `Size: ${item.size}` : null,
        item.color ? `Color: ${item.color}` : null,
      ].filter(Boolean).join(', ');
      return `- ${item.productName} x${item.quantity}${specs ? ` (${specs})` : ''} - £${(item.priceAtPurchase * item.quantity).toFixed(2)}`;
    }).join('\n');

    const textBody = [
      `Hi ${firstName},`,
      '',
      'Thank you for your purchase from Elucid LDN!',
      '',
      `Order ID: ${orderId}`,
      '',
      'Your Order:',
      itemsText,
      '',
      `Subtotal: £${subtotal.toFixed(2)}`,
      discount && discount > 0 ? `Discount: -£${discount.toFixed(2)}` : null,
      `Shipping: £${shipping.toFixed(2)}`,
      `Tax: £${tax.toFixed(2)}`,
      `Total: £${total.toFixed(2)}`,
      '',
      'We will let you know as soon as your order is on its way.',
      '',
      '— The Elucid LDN Team',
    ].filter(Boolean).join('\n');

    // Generate items HTML
    const itemsHtml = items.map(item => {
      const specs = [
        item.size ? `Size: ${item.size}` : null,
        item.color ? `Color: ${item.color}` : null,
      ].filter(Boolean).join(' • ');

      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #E8E5E0;">
            <div style="display: flex; gap: 12px;">
              ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" style="width: 60px; height: 60px; object-fit: cover; border: 1px solid #E8E5E0;" />` : ''}
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${item.productName}</div>
                ${specs ? `<div style="font-size: 13px; color: #6B6662; margin-bottom: 4px;">${specs}</div>` : ''}
                <div style="font-size: 13px; color: #6B6662;">Quantity: ${item.quantity}</div>
              </div>
            </div>
          </td>
          <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #E8E5E0;">
            £${(item.priceAtPurchase * item.quantity).toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #2B2826; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Thank you for your purchase</h1>
        <p style="color: #6B6662; margin-bottom: 24px;">Order #${orderId}</p>

        <p style="margin-bottom: 24px;">Hi ${firstName},</p>

        <p style="margin-bottom: 24px;">
          Thank you for your purchase from <strong>Elucid LDN</strong>. We appreciate your support!
        </p>

        <div style="background: #FAF9F7; padding: 20px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin: 0 0 16px 0;">Order Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${itemsHtml}
          </table>

          <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid #2B2826;">
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0;">Subtotal:</td>
                <td style="text-align: right;">£${subtotal.toFixed(2)}</td>
              </tr>
              ${discount && discount > 0 ? `
              <tr>
                <td style="padding: 4px 0; color: #B5956D;">Discount:</td>
                <td style="text-align: right; color: #B5956D;">-£${discount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 4px 0;">Shipping:</td>
                <td style="text-align: right;">£${shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">Tax:</td>
                <td style="text-align: right;">£${tax.toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold; font-size: 16px;">
                <td style="padding: 12px 0 0 0;">Total:</td>
                <td style="text-align: right; padding: 12px 0 0 0;">£${total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>

        <p style="margin-bottom: 20px;">
          We'll email you again as soon as your order is on its way.
        </p>

        <p style="margin-bottom: 0; color: #6B6662;">— The Elucid LDN Team</p>
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
