import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BackInStockEmailParams {
  email: string;
  productName: string;
  productUrl: string;
  productImage?: string;
  productPrice?: string;
}

export async function sendBackInStockEmail({
  email,
  productName,
  productUrl,
  productImage,
  productPrice,
}: BackInStockEmailParams) {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Back in Stock - ${productName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f0;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border: 1px solid #e0e0e0;">
            <!-- Header -->
            <div style="background-color: #2c2c2c; color: #f5f5f0; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">ELUCID</h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="font-size: 24px; margin-top: 0; margin-bottom: 20px; color: #2c2c2c;">Good News!</h2>

              <p style="font-size: 16px; margin-bottom: 25px; color: #555;">
                <strong>${productName}</strong> is back in stock!
              </p>

              ${productImage ? `
                <div style="text-align: center; margin: 30px 0;">
                  <img src="${productImage}" alt="${productName}" style="max-width: 100%; height: auto; border: 1px solid #e0e0e0;" />
                </div>
              ` : ''}

              ${productPrice ? `
                <p style="font-size: 18px; font-weight: 600; margin-bottom: 25px; color: #2c2c2c;">
                  ${productPrice}
                </p>
              ` : ''}

              <p style="font-size: 15px; margin-bottom: 30px; color: #555;">
                You requested to be notified when this item became available. Act fast - stock is limited!
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${productUrl}" style="display: inline-block; background-color: #2c2c2c; color: #f5f5f0; text-decoration: none; padding: 14px 40px; font-size: 14px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; transition: background-color 0.3s;">
                  Shop Now
                </a>
              </div>

              <p style="font-size: 13px; color: #888; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                This is an automated notification because you signed up for back-in-stock alerts for this product. If you no longer wish to receive these notifications, you can unsubscribe from your account settings.
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
Good News!

${productName} is back in stock!

${productPrice ? `Price: ${productPrice}` : ''}

You requested to be notified when this item became available. Act fast - stock is limited!

Shop now: ${productUrl}

---

This is an automated notification because you signed up for back-in-stock alerts for this product.

ELUCID LONDON
Contemporary Streetwear Crafted in London
© ${new Date().getFullYear()} Elucid London. All rights reserved.
    `.trim();

    await resend.emails.send({
      from: 'Elucid London <hello@elucid.london>',
      to: email,
      subject: `${productName} is Back in Stock!`,
      html: htmlContent,
      text: textContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending back-in-stock email:', error);
    return { success: false, error };
  }
}
