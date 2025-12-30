import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ShippingConfirmationParams {
  email: string;
  orderNumber: string;
  trackingNumber: string;
  trackingUrl?: string;
  items: Array<{
    name: string;
    quantity: number;
    size?: string;
    color?: string;
  }>;
}

export async function sendShippingConfirmationEmail({
  email,
  orderNumber,
  trackingNumber,
  trackingUrl,
  items,
}: ShippingConfirmationParams) {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Order Has Shipped - ${orderNumber}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f0;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border: 1px solid #e0e0e0;">
            <!-- Header -->
            <div style="background-color: #2c2c2c; color: #f5f5f0; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">ELUCID</h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="font-size: 24px; margin-top: 0; margin-bottom: 20px; color: #2c2c2c;">Your Order Has Shipped!</h2>

              <p style="font-size: 16px; margin-bottom: 25px; color: #555;">
                Good news! Your order <strong>${orderNumber}</strong> is on its way.
              </p>

              <!-- Tracking Info -->
              <div style="background-color: #f5f5f0; padding: 20px; margin: 25px 0; border-left: 4px solid #2c2c2c;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">
                  Tracking Number
                </p>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #2c2c2c;">
                  ${trackingNumber}
                </p>
              </div>

              ${trackingUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${trackingUrl}" style="display: inline-block; background-color: #2c2c2c; color: #f5f5f0; text-decoration: none; padding: 14px 40px; font-size: 14px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase;">
                    Track Your Order
                  </a>
                </div>
              ` : ''}

              <!-- Order Items -->
              <div style="margin: 30px 0; padding-top: 25px; border-top: 1px solid #e0e0e0;">
                <h3 style="font-size: 16px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; color: #2c2c2c;">
                  Order Items
                </h3>
                ${items.map(item => `
                  <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;">
                    <p style="margin: 0 0 5px 0; font-size: 15px; color: #333;">
                      <strong>${item.name}</strong> × ${item.quantity}
                    </p>
                    ${item.size || item.color ? `
                      <p style="margin: 0; font-size: 13px; color: #888;">
                        ${item.size ? `Size: ${item.size}` : ''}
                        ${item.size && item.color ? ' • ' : ''}
                        ${item.color ? `Color: ${item.color}` : ''}
                      </p>
                    ` : ''}
                  </div>
                `).join('')}
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 25px;">
                You'll receive your order soon. If you have any questions about your shipment, please don't hesitate to contact us at
                <a href="mailto:info@elucid.london" style="color: #2c2c2c;">info@elucid.london</a>.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f5f5f0; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #666;">
                <strong>ELUCID LONDON</strong>
              </p>
              <p style="margin: 0 0 15px 0; font-size: 12px; color: #888;">
                Contemporary Streetwear Crafted in London
              </p>
              <div style="margin: 15px 0;">
                <a href="https://www.instagram.com/elucid.ldn" style="color: #2c2c2c; text-decoration: none; margin: 0 10px; font-size: 12px;">Instagram</a>
                <span style="color: #ccc;">|</span>
                <a href="https://www.tiktok.com/@elucid.ldn6" style="color: #2c2c2c; text-decoration: none; margin: 0 10px; font-size: 12px;">TikTok</a>
                <span style="color: #ccc;">|</span>
                <a href="https://www.elucid.london" style="color: #2c2c2c; text-decoration: none; margin: 0 10px; font-size: 12px;">Website</a>
              </div>
              <p style="margin: 15px 0 0 0; font-size: 11px; color: #999;">
                © ${new Date().getFullYear()} Elucid London. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Your Order Has Shipped!

Good news! Your order ${orderNumber} is on its way.

TRACKING NUMBER
${trackingNumber}

${trackingUrl ? `Track your order: ${trackingUrl}\n` : ''}

ORDER ITEMS
${items.map(item => `
${item.name} × ${item.quantity}
${item.size ? `Size: ${item.size}` : ''} ${item.color ? `Color: ${item.color}` : ''}
`.trim()).join('\n')}

You'll receive your order soon. If you have any questions about your shipment, please don't hesitate to contact us at info@elucid.london.

ELUCID LONDON
Contemporary Streetwear Crafted in London
© ${new Date().getFullYear()} Elucid London. All rights reserved.
    `.trim();

    await resend.emails.send({
      from: 'Elucid London <hello@elucid.london>',
      to: email,
      subject: `Your Elucid Order ${orderNumber} Has Shipped`,
      html: htmlContent,
      text: textContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending shipping confirmation email:', error);
    return { success: false, error };
  }
}
