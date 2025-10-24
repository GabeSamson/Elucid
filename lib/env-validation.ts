/**
 * Environment Variable Validation
 *
 * This module validates that all required environment variables are set
 * at application startup. If any required variables are missing, the
 * application will fail to start with a clear error message.
 *
 * Import this file in your root layout or entry point to ensure
 * validation happens before the app starts.
 */

import { z } from 'zod';

const envSchema = z.object({
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // NextAuth Configuration
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters. Generate with: openssl rand -base64 32'),

  // Stripe Configuration (Required)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),

  // Email Service Configuration (Required)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required for sending emails'),

  // OAuth Providers (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),

  // Currency Configuration (Optional with defaults)
  NEXT_PUBLIC_BASE_CURRENCY: z.string().default('GBP'),
  NEXT_PUBLIC_CURRENCY: z.string().default('GBP'),
  NEXT_PUBLIC_CURRENCY_RATES: z.string().optional(),
  NEXT_PUBLIC_CURRENCY_SYMBOL: z.string().default('£'),
  NEXT_PUBLIC_LOCALE: z.string().default('en-GB'),
  NEXT_PUBLIC_FLAT_SHIPPING_FEE: z.string().optional(),
  NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at application startup
 * @throws {Error} If required environment variables are missing or invalid
 */
export function validateEnv(): Env {
  const env = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
    APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET,
    NEXT_PUBLIC_BASE_CURRENCY: process.env.NEXT_PUBLIC_BASE_CURRENCY,
    NEXT_PUBLIC_CURRENCY: process.env.NEXT_PUBLIC_CURRENCY,
    NEXT_PUBLIC_CURRENCY_RATES: process.env.NEXT_PUBLIC_CURRENCY_RATES,
    NEXT_PUBLIC_CURRENCY_SYMBOL: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL,
    NEXT_PUBLIC_LOCALE: process.env.NEXT_PUBLIC_LOCALE,
    NEXT_PUBLIC_FLAT_SHIPPING_FEE: process.env.NEXT_PUBLIC_FLAT_SHIPPING_FEE,
    NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD: process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      }).join('\n');

      throw new Error(
        `❌ Environment variable validation failed:\n\n${missingVars}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`
      );
    }
    throw error;
  }
}

/**
 * Validates OAuth provider configuration
 * Warns if OAuth credentials are incomplete
 */
export function validateOAuthProviders(env: Env): void {
  const warnings: string[] = [];

  // Check Google OAuth
  if (env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_SECRET) {
    warnings.push('⚠️  GOOGLE_CLIENT_ID is set but GOOGLE_CLIENT_SECRET is missing. Google sign-in will not work.');
  } else if (!env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    warnings.push('⚠️  GOOGLE_CLIENT_SECRET is set but GOOGLE_CLIENT_ID is missing. Google sign-in will not work.');
  }

  // Check Apple Sign In
  if (env.APPLE_CLIENT_ID && !env.APPLE_CLIENT_SECRET) {
    warnings.push('⚠️  APPLE_CLIENT_ID is set but APPLE_CLIENT_SECRET is missing. Apple sign-in will not work.');
  } else if (!env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
    warnings.push('⚠️  APPLE_CLIENT_SECRET is set but APPLE_CLIENT_ID is missing. Apple sign-in will not work.');
  }

  if (warnings.length > 0) {
    console.warn('\n' + warnings.join('\n') + '\n');
  }
}

/**
 * Security checks for environment configuration
 */
export function performSecurityChecks(env: Env): void {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check NEXTAUTH_SECRET length
  if (env.NEXTAUTH_SECRET.length < 32) {
    errors.push('🔒 NEXTAUTH_SECRET is too short. Use at least 32 characters. Generate with: openssl rand -base64 32');
  }

  // Check for default/placeholder values
  if (env.NEXTAUTH_SECRET.includes('your_generated_secret_here')) {
    errors.push('🔒 NEXTAUTH_SECRET is still set to the default placeholder value!');
  }

  if (env.STRIPE_SECRET_KEY.includes('your_key_here')) {
    errors.push('🔒 STRIPE_SECRET_KEY is still set to the default placeholder value!');
  }

  // Check for development keys in production
  if (process.env.NODE_ENV === 'production') {
    if (env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      warnings.push('⚠️  Using Stripe TEST keys in production environment!');
    }
    if (env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
      errors.push('🔒 NEXT_PUBLIC_APP_URL is set to localhost in production!');
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Security Warnings:\n' + warnings.join('\n') + '\n');
  }

  // Display errors and exit if critical
  if (errors.length > 0) {
    throw new Error(
      '\n❌ Critical Security Issues:\n' +
      errors.join('\n') +
      '\n\nFix these issues before starting the application.\n'
    );
  }
}

/**
 * Main validation function - call this at application startup
 */
export function initializeEnvValidation(): Env {
  console.log('🔍 Validating environment variables...');

  const env = validateEnv();
  validateOAuthProviders(env);
  performSecurityChecks(env);

  console.log('✅ Environment validation passed\n');

  return env;
}

// Uncomment the line below to run validation immediately when this file is imported
// This ensures validation happens before the app starts
// export const validatedEnv = initializeEnvValidation();
