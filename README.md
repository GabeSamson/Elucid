# Elucid LDN - E-Commerce Platform

A complete, modern e-commerce platform for streetwear built with Next.js, Prisma (SQLite), NextAuth, and Stripe.

## ✨ Features

### Customer Features
- 🛍️ Browse products by collection
- 🔍 Filter and sort products
- 🛒 Shopping cart with persistence
- 💳 Secure Stripe checkout
- 👤 User accounts with order history
- 📧 Newsletter subscription
- 📱 Fully mobile-responsive design

### Admin Features
- 📊 Dashboard with analytics and revenue tracking
- 📦 Product management and inventory
- 🚚 Order management with status updates
- 💰 In-person sales entry
- 📈 Analytics and financial reports
- ⚠️ Low stock alerts

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
The database is already created and seeded! It's a local SQLite file at `prisma/dev.db`.

**Default admin account:**
- Email: `admin@elucidldn.com`
- Password: `admin123`

If you need to reset the database:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Configure Environment Variables

Generate a NextAuth secret:
```bash
openssl rand -base64 32
```

Copy the output and add it to `.env.local`:
```env
NEXTAUTH_SECRET=your_generated_secret_here
```

### 4. Set Up Stripe (for payments)

1. Create a free account at [stripe.com](https://stripe.com)
2. Go to Dashboard > Developers > API keys (make sure you're in **Test mode**)
3. Copy your keys to `.env.local`:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

4. For local webhook testing, install Stripe CLI:
```bash
# Mac
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret (starts with `whsec_`) to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5. Start the Development Server
```bash
npm run dev
```

Visit **http://localhost:3000** to see your store!

## 🎮 Using the Platform

### As a Customer
1. Browse products at `/shop` or `/collections`
2. Add items to cart
3. Sign up or sign in (click "Sign In" in navigation)
4. Go to checkout and use Stripe test card: `4242 4242 4242 4242`
5. View your orders at `/account`

### As an Admin
1. Sign in with `admin@elucidldn.com` / `admin123`
2. Visit `/admin` to access the dashboard
3. Manage products, orders, and view analytics
4. Record in-person sales at `/admin/in-person`

## 📁 Project Structure

```
/app                    # Next.js 15 app directory
  /admin               # Admin dashboard pages
  /api                 # API routes
  /shop                # Shop page
  /products/[id]       # Product detail pages
  /checkout            # Checkout page
/components            # React components
/contexts              # React contexts (Cart, etc.)
/lib                   # Utilities (Prisma client)
/prisma                # Database schema and migrations
  dev.db              # SQLite database file
  schema.prisma       # Database schema
  seed.ts             # Sample data
```

## 🗄️ Database

The platform uses **SQLite** - a single-file database that runs locally with zero configuration. The database file is at `prisma/dev.db`.

**Advantages:**
- ✅ No external services needed
- ✅ Works on Mac, Windows, Linux
- ✅ Perfect for small to medium stores
- ✅ Easy to backup (just copy the file!)
- ✅ Fast and reliable

To backup your database:
```bash
cp prisma/dev.db prisma/backup-$(date +%Y%m%d).db
```

## 💳 Testing Payments

Stripe test card numbers:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0027 6000 3184`

Use any future expiry date and any CVC.

## 🔧 Common Tasks

### Add a New Product
1. Sign in as admin
2. Go to `/admin/products`
3. Products are managed in the database directly for now
4. Or use Prisma Studio: `npx prisma studio`

### View Database
```bash
npx prisma studio
```
Opens a GUI at http://localhost:5555 to view/edit data

### Reset Database
```bash
rm prisma/dev.db
npx prisma db push
npx tsx prisma/seed.ts
```

### Deploy to Production

The SQLite database works great for production on a single server. For deployment:

1. **Vercel/Netlify:** Not recommended (serverless doesn't work well with SQLite)
2. **VPS/Dedicated Server:** Perfect! Just copy the entire project
3. **For scale:** Migrate to PostgreSQL using Prisma (easy!)

Example production setup on Ubuntu:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo>
cd elucidldn
npm install
npm run build

# Start with PM2 (process manager)
npm install -g pm2
pm2 start npm --name "elucid" -- start
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

**Database locked error:**
- Only one process can write at a time
- Make sure dev server isn't running when using Prisma Studio

**Stripe webhook not working:**
- Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Check the webhook secret matches

**Can't sign in as admin:**
- Reset database and reseed: `rm prisma/dev.db && npx prisma db push && npx tsx prisma/seed.ts`

## 📦 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** SQLite with Prisma ORM
- **Authentication:** NextAuth.js v5
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Language:** TypeScript

## 📝 Notes

- The database file (`prisma/dev.db`) contains all your data - **back it up regularly!**
- Stripe is in test mode by default - use test cards for payments
- Admin account: `admin@elucidldn.com` / `admin123`
- All product images are placeholders - add real images via image URLs

## 🎨 Customization

- Colors are defined in `tailwind.config.ts`
- Change brand name in components
- Add your logo at `public/logo.svg`
- Modify product data in `prisma/seed.ts`

## 📄 License

Private project - All rights reserved

---

**Elucid LDN** - Shade onto light
