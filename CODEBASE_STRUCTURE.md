# Elucid LDN Codebase Structure - Comprehensive Summary

## Overview
Elucid LDN is a Next.js e-commerce platform with a comprehensive admin panel built with React, TypeScript, Tailwind CSS, and PostgreSQL (via Prisma ORM). The application handles product management, orders, checkout, newsletter subscriptions, and analytics.

**Tech Stack:**
- Frontend: React 19, Next.js 15.5.6, Tailwind CSS
- Backend: Next.js API Routes, Prisma ORM
- Database: PostgreSQL (Neon)
- Authentication: NextAuth.js v5
- Payment: Stripe
- Email: Resend
- UI Libraries: Framer Motion, Recharts, React Hook Form
- Security: bcryptjs, Zod validation

---

## 1. Newsletter Admin Panel

### Location
**File:** `/Users/gabesamson/Documents/Elucid/app/admin/newsletter/page.tsx`

### Current Implementation

#### Features
- **Subscriber Management:**
  - View all verified newsletter subscribers
  - Display subscriber count (total verified + active count)
  - Remove individual subscribers
  - Export subscribers to CSV

- **Email Composer:**
  - Modal-based email composition
  - Subject and HTML content fields
  - Preview functionality
  - Batch send to all active subscribers
  - Confirmation before sending

#### UI Components
- Table displaying: Email, Status (Active/Inactive), Subscription Date, Actions
- Buttons: Compose Email, Export to CSV
- Modal with form for composing newsletters
- Real-time feedback messages (success/error)

#### Key Functions
```typescript
// Fetch subscribers
GET /api/admin/newsletter

// Send newsletter
POST /api/admin/newsletter/send
Body: { subject: string, content: string }

// Remove subscriber
DELETE /api/admin/newsletter?email=xxx@xxx.com
```

### Related Email Logic
**File:** `/Users/gabesamson/Documents/Elucid/app/api/admin/newsletter/send/route.ts`

- Uses **Resend** email service for sending
- Rate limiting: 2 emails/second (batched with 1.1s delays)
- Sends to all active, verified subscribers
- Records sent newsletters in `NewsletterEmail` table
- Admin role required (verified via NextAuth)

### Database Schema
```prisma
model Newsletter {
  id                 String   @id @default(uuid())
  email              String   @unique
  active             Boolean  @default(true)
  verified           Boolean  @default(false)
  verificationToken  String?  @unique
  createdAt          DateTime @default(now())
}

model NewsletterEmail {
  id          String   @id @default(uuid())
  subject     String
  content     String   // HTML content
  sentCount   Int      @default(0)
  sentBy      String   // User ID of sender
  sentAt      DateTime @default(now())
}
```

---

## 2. Database Schema

### Core Models

#### User
- Email authentication with password hashing
- Email verification system
- Reset password functionality
- Shipping address storage (JSON)
- Preferred currency setting
- Role-based access control (admin/user)

```prisma
model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  password           String?
  name               String?
  avatarUrl          String?
  role               String    @default("user")
  emailVerified      Boolean   @default(false)
  verificationToken  String?
  resetPasswordToken String?
  resetPasswordExpires DateTime?
  preferredCurrency  String?   @default("GBP")
  shippingAddress    String?   // JSON as string
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  orders             Order[]
}
```

#### Product
- Full product information with pricing
- Multi-currency price overrides
- Cost tracking for profit calculations
- Image gallery (JSON array)
- Size/Color variants with dimensions
- Collection association
- Material specifications
- Coming soon functionality with release dates

```prisma
model Product {
  id              String    @id @default(uuid())
  name            String
  description     String
  price           Float
  priceOverrides  String?   // JSON: { "USD": 99.99, "EUR": 89.99 }
  compareAtPrice  Float?
  costPrice       Float?    // For profit calculations
  images          String    @default("[]") // JSON array
  stock           Int       @default(0)
  collectionId    String?
  sizes           String    @default("[]")
  colors          String    @default("[]") // [{"name": "Navy Blue", "hexCode": "#001F3F"}]
  sizeDimensions  String?   // {"S": "Length: 28in, Width: 20in"}
  materials       String?
  featured        Boolean   @default(false)
  active          Boolean   @default(true)
  includeShipping Boolean   @default(true)
  comingSoon      Boolean   @default(false)
  releaseDate     DateTime?
  targetAudience  ProductAudience @default(UNISEX) // MALE, FEMALE, UNISEX
  madeIn          String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  collection      Collection? @relation(fields: [collectionId], references: [id])
  orderItems      OrderItem[]
  variants        ProductVariant[]
}

enum ProductAudience {
  MALE
  FEMALE
  UNISEX
}
```

#### Order
- Complete order lifecycle tracking
- Multi-promo code support
- In-person sales tracking
- Order notes for internal communication
- Stripe payment integration

```prisma
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

model Order {
  id              String      @id @default(uuid())
  userId          String?
  email           String?
  name            String
  address         String      // JSON as string
  subtotal        Float
  shipping        Float
  tax             Float
  total           Float
  discount        Float       @default(0)
  promoCodeId     String?     // Legacy: first promo code
  promoCodeCode   String?     // Legacy: first promo code
  status          OrderStatus @default(PENDING)
  trackingNumber  String?
  shippedAt       DateTime?
  stripePaymentId String?
  isInPerson      Boolean     @default(false)
  notes           String?     // Internal notes for fulfillment
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  user            User?       @relation(fields: [userId], references: [id])
  promoCode       PromoCode?  @relation(fields: [promoCodeId], references: [id])
  items           OrderItem[]
  appliedPromos   OrderAppliedPromoCode[]
}

model OrderItem {
  id               String   @id @default(uuid())
  orderId          String
  productId        String
  productName      String
  productImage     String?
  quantity         Int
  size             String?
  color            String?
  priceAtPurchase  Float    // Snapshot of price at time of purchase
  createdAt        DateTime @default(now())
  
  order            Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product          Product  @relation(fields: [productId], references: [id])
}
```

#### PromoCode & Applied Promos
```prisma
enum PromoDiscountType {
  PERCENTAGE
  FIXED
}

model PromoCode {
  id                 String             @id @default(uuid())
  code               String             @unique
  description        String?
  discountType       PromoDiscountType
  amount             Float              // % or amount depending on type
  active             Boolean            @default(true)
  minimumOrderValue  Float?
  maxRedemptions     Int?
  redemptions        Int                @default(0)
  startsAt           DateTime?
  endsAt             DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  
  orders             Order[]
  appliedOrders      OrderAppliedPromoCode[]
}

model OrderAppliedPromoCode {
  id               String            @id @default(uuid())
  orderId          String
  promoCodeId      String?
  code             String
  discountType     PromoDiscountType
  amount           Float
  discountApplied  Float             @default(0) // Actual discount given
  createdAt        DateTime          @default(now())
  
  order            Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  promoCode        PromoCode?        @relation(fields: [promoCodeId], references: [id])
}
```

#### Other Key Models
- **Collection**: Product groupings with image and slug
- **ProductVariant**: Size/color combinations with individual stock tracking and SKU
- **HomepageConfig**: Hero section, countdown timer, featured collection configuration
- **PageView**: Traffic analytics with referrer and UTM parameters
- **OrderReferral**: Track referral sources for orders
- **CalendarEvent & TeamTask**: Team collaboration features
- **PersonalTask**: User-specific task management
- **PendingUser**: Users in signup process (pre-verification)

---

## 3. Orders & Checkout Flow

### Checkout Process
**Files:**
- Frontend: `/Users/gabesamson/Documents/Elucid/app/checkout/CheckoutContent.tsx`
- API: `/Users/gabesamson/Documents/Elucid/app/api/create-checkout-session/route.ts`
- Order Confirmation: `/Users/gabesamson/Documents/Elucid/app/api/orders/confirm/route.ts`

### Step-by-Step Flow

#### 1. **Checkout Page (`/checkout`)**
- **Authentication:** Redirects unauthenticated users to `/account?redirect=/checkout`
- **Cart Context:** Uses React Context for cart management
- **Buy Now Flow:** Single product purchase via sessionStorage

#### 2. **Checkout Form**
- Contact Information: Email, Full Name
- Shipping Address: Line 1, Line 2, City, State/County, Postal Code, Country
- Address Saving: Optional checkbox to save for future purchases
- Promo Code Application: Support for multiple promo codes

#### 3. **Order Summary**
- Item display with size/color specifications
- Dynamic pricing based on currency
- Promo code calculation with validation
- Free shipping logic:
  - Threshold-based (default £50)
  - Per-product basis (products with `includeShipping: false` exempt)
- Shipping fee: £5 standard (if applicable)
- Tax: Currently set to 0 (VAT mentioned in UI)

#### 4. **Promo Code Handling**
- Validation endpoint: `POST /api/promocodes/validate`
- Multiple promo codes supported
- Proportional discount allocation if total discount exceeds available amount
- Minimum order value validation
- Checks for already-applied codes

#### 5. **Stripe Checkout Session Creation**
```typescript
POST /api/create-checkout-session

Body: {
  items: Array<{
    productId, productName, productImage,
    quantity, size, color, priceAtPurchase
  }>,
  email, name, address,
  subtotal, subtotalAfterDiscount, shipping, tax, discount,
  promoCode, promoCodeId,
  promoCodes: Array<{ id, code, discountType, amount, discountAmount }>,
  total, currency
}

Returns: { url: "https://checkout.stripe.com/..." }
```

**Features:**
- Zero-decimal currency handling (JPY, KRW, etc.)
- Currency conversion from base (GBP) to user's preferred currency
- Creates Stripe coupon from promo codes
- Stores metadata in Stripe session for order creation
- Handles multiple promo codes in order appliedPromos

#### 6. **Order Confirmation (`/order/success`)**
- Calls `POST /api/orders/confirm` with Stripe session ID
- Creates `Order` record with:
  - Customer details from Stripe session
  - All order items
  - Applied promo codes (full history)
  - Payment intent ID tracking

#### 7. **Order Processing**
**File:** `/Users/gabesamson/Documents/Elucid/lib/orders/createOrderFromStripeSession.ts`

- Idempotency: Checks if order already exists by payment ID
- Retrieves line items from Stripe session
- Associates user ID if authenticated
- Parses and stores all promo codes applied
- **Sends thank-you email** via Resend

### In-Person Sales
**File:** `/Users/gabesamson/Documents/Elucid/app/admin/in-person/page.tsx`

- Admin creates orders without payment processing
- Manually select products, quantities, sizes, colors
- Customer name and email optional
- Records with `isInPerson: true` flag
- Treats as orders for inventory and analytics purposes

---

## 4. Analytics Page

### Location
**File:** `/Users/gabesamson/Documents/Elucid/app/admin/analytics/page.tsx`

### Key Metrics Section
Displays 9 key metrics in grid:
- **Total Revenue**: Sum of all order totals
- **Total Profit**: Revenue minus cost of goods
- **Profit Margin**: Percentage margin
- **Total Cost**: Sum of product cost prices
- **Total Orders**: Count of all orders
- **Avg Order Value**: Revenue / Orders
- **Unique Customers**: Distinct customer count
- **New Customers**: Customers with only 1 order
- **Returning Customers**: Customers with 2+ orders
- **Inventory Value**: Sum of (stock × cost price)

### Traffic Analytics
**Data Source:** `GET /api/analytics/stats?days=X`

- Total page views
- Unique pages accessed
- Top pages table with view counts
- Referrer analysis (organic, direct, etc.)
- UTM parameter tracking (source, medium, campaign)
- Visitor countries/geo-location
- Daily page view trend chart

### Variant Performance
Three breakdowns:
1. **Top Locations** (by order count & revenue)
2. **Color Performance** (units sold, revenue by color)
3. **Size Performance** (units sold, revenue by size)

### Revenue Trends
- Line chart showing revenue over selected time period
- Options: Last 7 days, 30 days, 90 days, 1 year, Lifetime

### Order & Sales Analysis
- **Order Status Distribution**: Pie chart showing PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- **Best Sellers**: Bar chart of top 5 products by revenue

### Product Performance Table
- Product name
- Units sold
- Revenue
- Cost
- Profit
- Profit margin %

### Inventory Alerts
- Shows products with low stock (< threshold)
- Lists variants with stock levels

### Time Range Selector
- Dropdown to filter all metrics by date range
- Recalculates all data dynamically

### Admin Features
- **Product Filter**: Can filter all analytics by specific product via query param `?product=id`
- **Reset Statistics**: Destructive action with 5-step confirmation requiring admin role

### Data Aggregation
**File:** `/Users/gabesamson/Documents/Elucid/app/api/admin/analytics`

- Fetches all orders in time range
- Groups by date for revenue trends
- Aggregates by product, color, size, country
- Calculates profit margins
- Tracks order statuses

---

## 5. Admin Panel Structure

### Layout & Navigation
**File:** `/Users/gabesamson/Documents/Elucid/app/admin/layout.tsx`

### Sidebar Navigation (Desktop)
Fixed left sidebar (hidden on mobile) with links to:
1. **Dashboard** (`/admin`) - Overview with key metrics and recent orders
2. **Homepage** (`/admin/homepage`) - Hero section, countdown, featured collection editing
3. **Products** (`/admin/products`) - View, create, edit products
4. **Inventory** (`/admin/inventory`) - Manage stock levels and variants
5. **Collections** (`/admin/collections`) - Create and manage product collections
6. **Orders** (`/admin/orders`) - Manage orders, update status, add tracking, internal notes
7. **In-Person Sales** (`/admin/in-person`) - Record cash/in-person transactions
8. **Analytics** (`/admin/analytics`) - Revenue, traffic, product performance
9. **Promo Codes** (`/admin/promocodes`) - Create and manage discount codes
10. **Workspace** (`/admin/workspace`) - Admin settings and configuration
11. **Team** (`/admin/team`) - Team member management
12. **Users** (`/admin/users`) - Customer/user management
13. **Newsletter** (`/admin/newsletter`) - Newsletter subscriber management and sending

### Dashboard (`/admin`)
**File:** `/Users/gabesamson/Documents/Elucid/app/admin/page.tsx`

Server-rendered with:
- Total product count
- Total orders count
- Pending orders requiring fulfillment
- Total revenue
- Recent pending orders (first 10)
- Profit calculations by time range:
  - Today
  - This week
  - This month
  - This year
  - Lifetime

### Security & Access Control
- NextAuth.js authentication required for `/admin` routes
- Admin role verification on sensitive endpoints
- Session-based authorization
- Protected API routes with role checks

### Responsive Design
- Desktop: Fixed sidebar navigation
- Mobile: Hamburger menu (collapsible)
- Tailwind CSS for styling

---

## 6. Email Functionality

### Email Service Provider
**Resend** (API Key: `RESEND_API_KEY`)
- From address: `Elucid LDN <hello@elucid.london>`
- Free tier rate limit: 2 emails/second

### Email Types

#### 1. Order Confirmation Email
**File:** `/Users/gabesamson/Documents/Elucid/lib/email/sendOrderThankYouEmail.ts`

**Triggered:** After successful order creation from Stripe session

**Content:**
- Order ID and customer name
- Item list with:
  - Product name
  - Quantity
  - Size and color specs
  - Unit and line item prices
  - Product image (if available)
- Order summary:
  - Subtotal
  - Discount (if applied)
  - Shipping
  - Tax
  - Total
- Thank you message and fulfillment notice

**Sends:** Both HTML and plain text versions

#### 2. Newsletter Verification Email
**File:** `/Users/gabesamson/Documents/Elucid/lib/email/sendNewsletterVerificationEmail.ts`

**Triggered:** When user subscribes to newsletter

**Content:**
- Subscription confirmation request
- Verification link with unique token
- Alternative plain text link
- Unsubscribe information

**Verification Flow:**
- Generates unique token stored in `Newsletter.verificationToken`
- Email contains link: `/newsletter/verify/{token}`
- User clicks link to confirm subscription

#### 3. Newsletter Broadcast
**File:** `/Users/gabesamson/Documents/Elucid/app/api/admin/newsletter/send/route.ts`

**Triggered:** Admin sends from newsletter panel

**Content:**
- Custom HTML content composed by admin
- Custom subject line
- Sent to all active, verified subscribers

**Rate Limiting:**
- Batches of 2 emails/second
- 1.1s delay between batches
- Respects Resend free tier limits

**Recording:**
- Creates `NewsletterEmail` record tracking:
  - Subject and content
  - Sent count
  - Sent by (admin user ID)
  - Sent at timestamp

### Email Verification System
**Files:**
- Subscription: `/Users/gabesamson/Documents/Elucid/app/api/newsletter/route.ts`
- Verification: `/Users/gabesamson/Documents/Elucid/app/api/newsletter/verify/[token]/route.ts`

**Flow:**
1. User subscribes at newsletter form
2. System checks user authentication
3. Creates/updates Newsletter record with `verified: false`
4. Sends verification email
5. User clicks link in email
6. Token validated and `verified: true` set
7. Subscriber now receives newsletters

---

## Implementation Patterns & Best Practices

### API Route Security
- NextAuth session validation
- Role-based authorization (admin checks)
- Zod schema validation for input
- Error handling with appropriate HTTP status codes

### State Management
- React Context for cart management (`CartContext`)
- Currency context for multi-currency support
- Local component state for forms

### Database
- Prisma ORM with PostgreSQL
- Transactions for multi-step operations
- Relationships and cascading deletes
- JSON fields for flexible data (prices, addresses, images)

### Styling
- Tailwind CSS utility classes
- Design tokens (charcoal-dark, cream-light, beige, etc.)
- Responsive mobile-first design
- CSS Grid and Flexbox layouts

### Performance
- Next.js dynamic route generation
- Server-side rendering for admin dashboard
- Client-side rendering for interactive pages
- Caching strategies with `cache: 'no-store'` for dynamic data

---

## Key Files Reference

| Feature | File Path |
|---------|-----------|
| Newsletter Admin | `/app/admin/newsletter/page.tsx` |
| Send Newsletter API | `/app/api/admin/newsletter/send/route.ts` |
| Get Subscribers API | `/app/api/admin/newsletter/route.ts` |
| Subscribe API | `/app/api/newsletter/route.ts` |
| Verify Newsletter | `/app/api/newsletter/verify/[token]/route.ts` |
| Checkout Page | `/app/checkout/CheckoutContent.tsx` |
| Stripe Session | `/app/api/create-checkout-session/route.ts` |
| Order Confirmation | `/app/api/orders/confirm/route.ts` |
| Create Order Logic | `/lib/orders/createOrderFromStripeSession.ts` |
| Order Thank You Email | `/lib/email/sendOrderThankYouEmail.ts` |
| Newsletter Verification Email | `/lib/email/sendNewsletterVerificationEmail.ts` |
| Orders Admin | `/app/admin/orders/page.tsx` |
| Analytics Admin | `/app/admin/analytics/page.tsx` |
| Analytics API | `/app/api/admin/analytics` |
| Admin Layout | `/app/admin/layout.tsx` |
| Database Schema | `/prisma/schema.prisma` |

---

## Environment Variables Required
```
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
RESEND_API_KEY=re_...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

