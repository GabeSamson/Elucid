import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface CartItem {
  productName: string;
  productImage?: string | null;
  quantity: number;
  priceAtPurchase: number;
  size?: string | null;
  color?: string | null;
}

interface AbandonedCartEmailParams {
  email: string;
  name?: string;
  items: CartItem[];
  subtotal: number;
  cartId: string;
}

export async function sendAbandonedCartEmail({
  email,
  name,
  items,
  subtotal,
  cartId,
}: AbandonedCartEmailParams) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.elucid.london';

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 15px; border-bottom: 1px solid #e5e5e5;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${
            item.productImage
              ? `<img src="${item.productImage}" alt="${item.productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />`
              : ''
          }
          <div>
            <div style="font-weight: 600; color: #2b2b2b; margin-bottom: 5px;">${item.productName}</div>
            ${
              item.size || item.color
                ? `<div style="font-size: 13px; color: #666;">
                     ${item.size ? `Size: ${item.size}` : ''}${item.size && item.color ? ' • ' : ''}${item.color ? `Color: ${item.color}` : ''}
                   </div>`
                : ''
            }
            <div style="font-size: 13px; color: #666; margin-top: 5px;">Qty: ${item.quantity}</div>
          </div>
        </div>
      </td>
      <td style="padding: 15px; text-align: right; border-bottom: 1px solid #e5e5e5; white-space: nowrap;">
        <strong style="color: #2b2b2b;">£${(item.priceAtPurchase * item.quantity).toFixed(2)}</strong>
      </td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Purchase</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

                <!-- Header -->
                <tr>
                  <td style="background-color: #2b2b2b; padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #f5f5f5; font-size: 28px; font-weight: 400; letter-spacing: 2px;">ELUCID LONDON</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #2b2b2b; font-size: 24px; font-weight: 600;">
                      ${name ? `Hi ${name},` : 'Hi there,'}
                    </h2>

                    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
                      You left some items in your cart. We've saved them for you! Complete your purchase now before they're gone.
                    </p>

                    <!-- Cart Items -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <thead>
                        <tr>
                          <th style="padding: 15px; text-align: left; border-bottom: 2px solid #2b2b2b; color: #2b2b2b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                            Item
                          </th>
                          <th style="padding: 15px; text-align: right; border-bottom: 2px solid #2b2b2b; color: #2b2b2b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td style="padding: 20px 15px 15px; text-align: right; font-weight: 600; color: #2b2b2b; font-size: 16px;">
                            Subtotal:
                          </td>
                          <td style="padding: 20px 15px 15px; text-align: right; font-weight: 600; color: #2b2b2b; font-size: 16px;">
                            £${subtotal.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 40px 0 30px;">
                      <a href="${APP_URL}/checkout"
                         style="display: inline-block; background-color: #2b2b2b; color: #f5f5f5; text-decoration: none; padding: 16px 40px; font-size: 14px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 4px;">
                        Complete Your Purchase
                      </a>
                    </div>

                    <p style="margin: 30px 0 0; color: #999; font-size: 14px; line-height: 1.6; text-align: center;">
                      If you have any questions, feel free to reply to this email or contact us at
                      <a href="mailto:Elucid.Ldn@gmail.com" style="color: #2b2b2b; text-decoration: none;">Elucid.Ldn@gmail.com</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0 0 10px; color: #999; font-size: 12px;">
                      © ${new Date().getFullYear()} Elucid London. All rights reserved.
                    </p>
                    <p style="margin: 0; color: #999; font-size: 12px;">
                      Made in London
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: 'Elucid London <hello@elucid.london>',
    to: email,
    subject: 'You left something behind...',
    html: htmlContent,
  });
}
