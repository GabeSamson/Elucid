# Pre-Deployment Security Checklist
## Elucid E-Commerce Application

This checklist must be completed before deploying the application to production. Each item should be verified and checked off.

---

## 🔐 Critical Security Fixes (MUST COMPLETE)

### Authentication & Authorization

- [ ] **Admin API Endpoints Protected**
  - [ ] `/api/admin/products` route has authentication check
  - [ ] `/api/admin/products/[id]` route has authentication check (GET, PUT, DELETE)
  - [ ] `/api/admin/upload` route has authentication check
  - [ ] Verify: Test that unauthenticated requests return 401 Unauthorized

- [ ] **Password Security**
  - [ ] Minimum password length is 12 characters
  - [ ] Password complexity requirements enforced (uppercase, lowercase, number, special char)
  - [ ] Password policy is consistent across signup and login
  - [ ] Test: Try creating an account with weak password (should fail)

- [ ] **File Upload Security**
  - [ ] File uploads require admin authentication
  - [ ] Cryptographically secure random filenames (crypto.randomBytes)
  - [ ] File extensions whitelisted (not taken from user input)
  - [ ] MIME type validation matches file extension
  - [ ] File size limits enforced (5MB)
  - [ ] Test: Try uploading file without authentication (should fail)

---

## 🔒 Environment Configuration

### Required Environment Variables

- [ ] **NextAuth Configuration**
  ```bash
  # Generate with: openssl rand -base64 32
  NEXTAUTH_SECRET=<32+ character secret>
  NEXTAUTH_URL=https://yourdomain.com
  ```
  - [ ] NEXTAUTH_SECRET is at least 32 characters
  - [ ] NEXTAUTH_SECRET is NOT the default placeholder value
  - [ ] NEXTAUTH_URL points to production domain (not localhost)

- [ ] **Stripe Configuration**
  ```bash
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```
  - [ ] Using LIVE keys (pk_live_, sk_live_) not test keys
  - [ ] Webhook secret matches Stripe dashboard webhook configuration
  - [ ] Test webhook endpoint with Stripe CLI before deployment

- [ ] **Email Service**
  ```bash
  RESEND_API_KEY=re_...
  ```
  - [ ] Resend API key is valid and active
  - [ ] Sending domain is verified in Resend dashboard
  - [ ] Test: Send verification email in production

- [ ] **Application URL**
  ```bash
  NEXT_PUBLIC_APP_URL=https://yourdomain.com
  ```
  - [ ] Set to production domain (not localhost)
  - [ ] Uses HTTPS protocol
  - [ ] No trailing slash

### Optional OAuth Configuration

- [ ] **Google OAuth** (if using)
  - [ ] GOOGLE_CLIENT_ID set
  - [ ] GOOGLE_CLIENT_SECRET set
  - [ ] Authorized redirect URIs configured in Google Console
  - [ ] Test: Google sign-in works in production

- [ ] **Apple Sign In** (if using)
  - [ ] APPLE_CLIENT_ID set
  - [ ] APPLE_CLIENT_SECRET set
  - [ ] Service ID configured in Apple Developer portal
  - [ ] Test: Apple sign-in works in production

---

## 🛡️ Security Headers

- [ ] **Security Headers Configured** (next.config.ts)
  - [ ] Strict-Transport-Security (HSTS) enabled
  - [ ] X-Frame-Options set to DENY
  - [ ] X-Content-Type-Options set to nosniff
  - [ ] Content-Security-Policy configured
  - [ ] Test: Check headers with https://securityheaders.com

- [ ] **CSP Exceptions Reviewed**
  - [ ] Stripe domains whitelisted (js.stripe.com, api.stripe.com)
  - [ ] Google/Apple OAuth domains whitelisted (if using)
  - [ ] No 'unsafe-eval' or 'unsafe-inline' unless absolutely necessary
  - [ ] Review and minimize CSP exceptions

---

## 🔍 Database Security

- [ ] **Database Configuration**
  - [ ] Production database is NOT SQLite (use PostgreSQL/MySQL)
  - [ ] Database credentials stored securely (not in code)
  - [ ] Database backups configured and tested
  - [ ] Database connection uses SSL/TLS

- [ ] **Initial Admin Account**
  - [ ] At least one admin account created
  - [ ] Admin password meets complexity requirements (12+ chars)
  - [ ] Test: Can log in as admin successfully
  - [ ] Admin email is a real, monitored email address

- [ ] **Data Validation**
  - [ ] All Prisma queries use proper error handling
  - [ ] No raw SQL queries (or properly parameterized if used)
  - [ ] Sensitive data (passwords) properly hashed

---

## 🚨 Rate Limiting & DoS Protection

### Recommended Rate Limits (Implement before production)

- [ ] **Authentication Endpoints**
  - [ ] Login: 5 attempts per account per 15 minutes
  - [ ] Signup: 5 attempts per IP per hour
  - [ ] Password reset: 3 attempts per IP per hour
  - [ ] Email verification: 3 attempts per email per hour

- [ ] **API Endpoints**
  - [ ] Promo code validation: 10 attempts per IP per minute
  - [ ] Order creation: 5 per user per minute
  - [ ] File upload: 10 per admin per hour

**Implementation Options:**
- Use Vercel rate limiting (if deploying to Vercel)
- Use Upstash Redis for rate limiting
- Use middleware-based rate limiting (e.g., express-rate-limit)

---

## 💳 Payment Security

- [ ] **Stripe Integration**
  - [ ] Using live API keys (not test keys)
  - [ ] Webhook signature verification enabled
  - [ ] Webhook endpoint is HTTPS only
  - [ ] Test webhook with Stripe CLI in production
  - [ ] Payment amounts validated server-side (not trusted from client)

- [ ] **Order Processing**
  - [ ] Orders only created from verified Stripe webhooks
  - [ ] Idempotency checks prevent duplicate orders
  - [ ] Stock levels decremented atomically
  - [ ] Test: Complete a real transaction in production

---

## 🔐 HTTPS & SSL/TLS

- [ ] **SSL Certificate**
  - [ ] Valid SSL certificate installed
  - [ ] Certificate not expired
  - [ ] Certificate covers all subdomains (if applicable)
  - [ ] Test: https://www.ssllabs.com/ssltest/

- [ ] **HTTPS Enforcement**
  - [ ] All HTTP requests redirect to HTTPS
  - [ ] HSTS header enabled (Strict-Transport-Security)
  - [ ] Cookies have Secure flag set
  - [ ] Test: Visit http://yourdomain.com (should redirect to https://)

---

## 📝 Logging & Monitoring

### Security Event Logging (Recommended)

- [ ] **Audit Trail**
  - [ ] Failed login attempts logged
  - [ ] Admin actions logged (product changes, user modifications)
  - [ ] File uploads logged with user ID
  - [ ] Suspicious activity alerts configured

- [ ] **Error Monitoring**
  - [ ] Error tracking service configured (Sentry, LogRocket, etc.)
  - [ ] Production errors monitored
  - [ ] Alerts for critical errors
  - [ ] No sensitive data in error logs

---

## 🧪 Security Testing

### Manual Testing

- [ ] **Authentication Testing**
  - [ ] Cannot access admin routes without authentication
  - [ ] Cannot access admin API endpoints without authentication
  - [ ] Session expires after logout
  - [ ] Password reset flow works correctly
  - [ ] Email verification required for new accounts

- [ ] **Authorization Testing**
  - [ ] Regular users cannot access admin endpoints
  - [ ] Users can only view/modify their own data
  - [ ] Admin users can access admin functionality
  - [ ] Test: Try accessing admin endpoints with regular user session

- [ ] **Input Validation Testing**
  - [ ] XSS payloads rejected
  - [ ] SQL injection attempts blocked
  - [ ] File upload restrictions enforced
  - [ ] Test: Try uploading PHP file (should be rejected)

### Automated Testing

- [ ] **Dependency Scanning**
  ```bash
  npm audit
  npm audit fix
  ```
  - [ ] No high or critical vulnerabilities
  - [ ] Dependencies up to date
  - [ ] Regular dependency updates scheduled

- [ ] **Security Headers**
  - [ ] Test with https://securityheaders.com
  - [ ] Grade A or A+ rating
  - [ ] All recommended headers present

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] **Code Review**
  - [ ] All critical security fixes verified
  - [ ] No TODO/FIXME comments in security-critical code
  - [ ] No console.log() with sensitive data
  - [ ] No hardcoded secrets in code

- [ ] **Environment Variables**
  - [ ] All required env vars set in production
  - [ ] No test/development keys in production
  - [ ] Env var validation runs at startup
  - [ ] Test: Run `npm run build` locally

- [ ] **Database**
  - [ ] Production database initialized
  - [ ] Prisma migrations applied
  - [ ] At least one admin user created
  - [ ] Database backups configured

### Post-Deployment

- [ ] **Smoke Testing**
  - [ ] Homepage loads successfully
  - [ ] Can browse products
  - [ ] Can add items to cart
  - [ ] Can create account
  - [ ] Can log in
  - [ ] Can complete checkout (test transaction)
  - [ ] Admin login works
  - [ ] Admin can create products

- [ ] **Security Verification**
  - [ ] HTTPS working correctly
  - [ ] Security headers present (check browser dev tools)
  - [ ] Admin endpoints return 401 when not authenticated
  - [ ] File uploads require authentication
  - [ ] Weak passwords rejected

---

## 📊 Monitoring Setup

- [ ] **Application Monitoring**
  - [ ] Uptime monitoring configured
  - [ ] Performance monitoring active
  - [ ] Error tracking enabled
  - [ ] Alerts configured for downtime

- [ ] **Security Monitoring**
  - [ ] Failed login attempt monitoring
  - [ ] Unusual traffic pattern detection
  - [ ] File upload monitoring
  - [ ] Admin action audit log

---

## 🔄 Ongoing Security Maintenance

### Weekly

- [ ] Review error logs for security issues
- [ ] Check for failed login attempts
- [ ] Monitor file upload activity

### Monthly

- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review admin access logs
- [ ] Test backup restoration
- [ ] Review security headers (securityheaders.com)

### Quarterly

- [ ] Security assessment/penetration test
- [ ] Review and rotate API keys
- [ ] Update dependencies
- [ ] Review access control policies

---

## 📋 Critical Vulnerabilities Fixed

The following critical vulnerabilities have been addressed:

✅ **FIXED: Unauthenticated Admin API Endpoints**
- Added authentication checks to `/api/admin/products`
- Added authentication checks to `/api/admin/products/[id]`
- Added authentication checks to `/api/admin/upload`

✅ **FIXED: Weak Password Policy**
- Increased minimum password length to 12 characters
- Added complexity requirements (uppercase, lowercase, number, special char)

✅ **FIXED: Weak File Upload Security**
- Replaced Math.random() with crypto.randomBytes()
- File extensions whitelisted (not from user input)
- Added authentication requirement

✅ **FIXED: Missing Security Headers**
- Added comprehensive security headers to next.config.ts
- Configured Content-Security-Policy
- Enabled HSTS, X-Frame-Options, etc.

---

## 🆘 Emergency Contacts

**If a security incident occurs:**

1. **Immediate Actions:**
   - Take affected systems offline if necessary
   - Preserve logs for investigation
   - Notify relevant stakeholders
   - Document incident timeline

2. **Contact Information:**
   - Development Team: [your-team@email.com]
   - Security Team: [security@email.com]
   - Hosting Provider Support: [provider support]
   - Stripe Support: https://support.stripe.com

3. **Incident Response:**
   - Review SECURITY_AUDIT_REPORT.md for vulnerability details
   - Check application logs for suspicious activity
   - Review database for unauthorized changes
   - Rotate compromised credentials immediately

---

## ✅ Final Sign-Off

Before deploying to production, confirm:

- [ ] All items in this checklist are completed
- [ ] Security audit report has been reviewed
- [ ] Critical vulnerabilities have been fixed and tested
- [ ] Environment variables are properly configured
- [ ] Database is initialized with admin account
- [ ] Monitoring and alerting is configured
- [ ] Incident response plan is in place

**Deployment Approval:**

- [ ] Developer Sign-Off: _______________ Date: ___________
- [ ] Security Review: _______________ Date: ___________
- [ ] Business Approval: _______________ Date: ___________

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Next Review:** Before each production deployment
