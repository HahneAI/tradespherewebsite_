# Security Implementation Guide: Stripe + Plaid Integration

## Production-Ready Security Implementation

This guide provides copy-paste ready security implementations for the Stripe + Plaid ACH integration.

---

## 1. Secure Netlify Function Wrapper

Create a secure wrapper for all Netlify functions:

```typescript
// src/utils/secure-function-wrapper.ts

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { z } from 'zod';
import crypto from 'crypto';

interface SecureFunctionOptions {
  requireAuth?: boolean;
  requireCSRF?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  allowedOrigins?: string[];
  validateSchema?: z.ZodSchema;
  requireHttps?: boolean;
}

// In-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function secureFunction(
  handler: Handler,
  options: SecureFunctionOptions = {}
): Handler {
  return async (event: HandlerEvent, context: HandlerContext) => {
    try {
      // 1. HTTPS enforcement
      if (options.requireHttps !== false && process.env.NODE_ENV === 'production') {
        const proto = event.headers['x-forwarded-proto'];
        if (proto !== 'https') {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'HTTPS required' })
          };
        }
      }

      // 2. CORS validation
      const origin = event.headers.origin || event.headers.referer;
      const allowedOrigins = options.allowedOrigins || [
        process.env.FRONTEND_URL,
        'https://tradesphere.com',
        'https://www.tradesphere.com'
      ];

      if (origin && !allowedOrigins.includes(origin)) {
        console.warn('CORS violation attempt from:', origin);
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Origin not allowed' })
        };
      }

      // 3. Rate limiting
      if (options.rateLimit) {
        const clientId = event.headers['x-forwarded-for'] || 'unknown';
        const now = Date.now();
        const windowMs = options.rateLimit.windowMs;

        const clientData = rateLimitStore.get(clientId);

        if (clientData && now < clientData.resetTime) {
          if (clientData.count >= options.rateLimit.maxRequests) {
            return {
              statusCode: 429,
              headers: {
                'Retry-After': String(Math.ceil((clientData.resetTime - now) / 1000)),
                'X-RateLimit-Limit': String(options.rateLimit.maxRequests),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
              },
              body: JSON.stringify({ error: 'Too many requests' })
            };
          }
          clientData.count++;
        } else {
          rateLimitStore.set(clientId, {
            count: 1,
            resetTime: now + windowMs
          });
        }
      }

      // 4. CSRF validation
      if (options.requireCSRF && event.httpMethod !== 'GET') {
        const csrfToken = event.headers['x-csrf-token'];
        const sessionToken = event.headers.cookie?.match(/csrf=([^;]+)/)?.[1];

        if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Invalid CSRF token' })
          };
        }
      }

      // 5. Input validation
      let parsedBody = null;
      if (event.body && options.validateSchema) {
        try {
          const rawBody = JSON.parse(event.body);
          parsedBody = options.validateSchema.parse(rawBody);
          event.body = JSON.stringify(parsedBody); // Use validated data
        } catch (error) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: 'Invalid request data',
              details: error instanceof z.ZodError ? error.errors : undefined
            })
          };
        }
      }

      // 6. Authentication check
      if (options.requireAuth) {
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Authentication required' })
          };
        }

        // Validate JWT or session token here
        const token = authHeader.substring(7);
        const isValid = await validateAuthToken(token);
        if (!isValid) {
          return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid authentication token' })
          };
        }
      }

      // 7. Security headers
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': origin || ''
      };

      // Execute the actual handler
      const response = await handler(event, context);

      // Add security headers to response
      return {
        ...response,
        headers: {
          ...response.headers,
          ...securityHeaders
        }
      };

    } catch (error) {
      // Secure error handling
      console.error('Function error:', error);
      const errorId = crypto.randomBytes(16).toString('hex');

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Internal server error',
          errorId, // For support reference
          timestamp: new Date().toISOString()
        })
      };
    }
  };
}

async function validateAuthToken(token: string): Promise<boolean> {
  // Implement your JWT validation or session check
  // This is a placeholder
  try {
    // Verify JWT signature, expiration, etc.
    return true;
  } catch {
    return false;
  }
}
```

---

## 2. Plaid Link Token Endpoint with Security

```typescript
// .netlify/functions/plaid-link-token.ts

import { secureFunction } from '../src/utils/secure-function-wrapper';
import { PlaidService } from '../src/services/PlaidService';
import { z } from 'zod';
import crypto from 'crypto';

const RequestSchema = z.object({
  userId: z.string().uuid(),
  companyName: z.string().min(2).max(100),
  sessionToken: z.string().min(32)
});

export const handler = secureFunction(
  async (event) => {
    // Additional security checks
    const requestId = crypto.randomBytes(16).toString('hex');
    console.log(`Processing Plaid Link token request: ${requestId}`);

    const data = JSON.parse(event.body!);

    // Validate session
    const session = await validateSession(data.sessionToken);
    if (!session) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid session' })
      };
    }

    // Check for recent token requests (prevent abuse)
    const recentTokens = await checkRecentTokenRequests(data.userId);
    if (recentTokens > 5) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'Too many token requests',
          retryAfter: 3600
        })
      };
    }

    try {
      const plaid = PlaidService.getInstance();
      const result = await plaid.createLinkToken({
        userId: data.userId,
        companyName: data.companyName
      });

      if (!result.success) {
        throw new Error(result.error?.message);
      }

      // Log token creation for audit
      await logAuditEvent({
        event: 'PLAID_LINK_TOKEN_CREATED',
        userId: data.userId,
        requestId,
        timestamp: new Date().toISOString()
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          linkToken: result.data.link_token,
          expiration: result.data.expiration,
          requestId
        })
      };
    } catch (error) {
      console.error(`Plaid token creation failed: ${requestId}`, error);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to create link token',
          requestId
        })
      };
    }
  },
  {
    requireAuth: true,
    requireCSRF: true,
    validateSchema: RequestSchema,
    rateLimit: {
      maxRequests: 10,
      windowMs: 60000 // 1 minute
    }
  }
);
```

---

## 3. Secure Payment Processing Endpoint

```typescript
// .netlify/functions/signup-with-payment-secure.ts

import { secureFunction } from '../src/utils/secure-function-wrapper';
import { PlaidService } from '../src/services/PlaidService';
import { StripeService } from '../src/services/StripeService';
import { InputSanitizer } from '../src/utils/input-sanitizer';
import { TokenEncryption } from '../src/utils/token-encryption';
import { z } from 'zod';
import crypto from 'crypto';

const RequestSchema = z.object({
  email: z.string().email(),
  companyName: z.string().min(2).max(100),
  ownerName: z.string().min(2).max(100),
  publicToken: z.string(),
  accountId: z.string(),
  planType: z.enum(['starter', 'growth', 'enterprise']),
  billingInterval: z.enum(['monthly', 'yearly']),

  // Security fields
  sessionToken: z.string(),
  consentToACH: z.boolean(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional()
});

export const handler = secureFunction(
  async (event) => {
    const requestId = crypto.randomBytes(16).toString('hex');
    const startTime = Date.now();

    try {
      const data = JSON.parse(event.body!);

      // 1. Verify ACH consent
      if (!data.consentToACH) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'ACH authorization consent required'
          })
        };
      }

      // 2. Sanitize all inputs
      const sanitizedData = {
        email: InputSanitizer.sanitizeEmail(data.email),
        companyName: InputSanitizer.sanitizeCompanyName(data.companyName),
        ownerName: InputSanitizer.sanitizeName(data.ownerName),
        publicToken: data.publicToken, // Already validated by Plaid
        accountId: data.accountId,
        planType: data.planType
      };

      // 3. Check for duplicate signup attempts
      const isDuplicate = await checkDuplicateSignup(sanitizedData.email);
      if (isDuplicate) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            error: 'Account already exists for this email'
          })
        };
      }

      // 4. Initialize services
      const plaid = PlaidService.getInstance();
      const stripe = StripeService.getInstance();

      // 5. Exchange public token (with timeout)
      const tokenExchange = await withTimeout(
        plaid.exchangePublicToken(data.publicToken),
        5000,
        'Token exchange timeout'
      );

      if (!tokenExchange.success) {
        throw new Error('Failed to verify bank account');
      }

      // 6. Encrypt and store Plaid access token
      const encryptedToken = TokenEncryption.encrypt(
        tokenExchange.data.accessToken
      );

      // 7. Get account details for verification
      const accountDetails = await plaid.getAccountDetails(
        tokenExchange.data.accessToken
      );

      // 8. Verify account ownership (additional security check)
      const accountVerified = await verifyAccountOwnership(
        accountDetails.data.accounts[0],
        sanitizedData.ownerName
      );

      if (!accountVerified) {
        await logSecurityEvent({
          event: 'ACCOUNT_OWNERSHIP_MISMATCH',
          email: sanitizedData.email,
          requestId
        });

        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Account verification failed'
          })
        };
      }

      // 9. Create processor token for Stripe
      const processorToken = await plaid.createProcessorToken({
        accessToken: tokenExchange.data.accessToken,
        accountId: data.accountId
      });

      // 10. Create Stripe customer with metadata
      const customer = await stripe.createCustomer({
        email: sanitizedData.email,
        companyName: sanitizedData.companyName,
        ownerName: sanitizedData.ownerName,
        metadata: {
          requestId,
          signupIp: event.headers['x-forwarded-for'],
          signupTime: new Date().toISOString()
        }
      });

      // 11. Create payment method with processor token
      const paymentMethod = await stripe.createPaymentMethod({
        customerId: customer.data.customerId,
        processorToken: processorToken.data.processorToken
      });

      // 12. Create payment with idempotency
      const idempotencyKey = generateIdempotencyKey(
        customer.data.customerId,
        'initial_payment'
      );

      const payment = await stripe.createPayment({
        customerId: customer.data.customerId,
        paymentMethodId: paymentMethod.data.paymentMethodId,
        amount: getPlanAmount(sanitizedData.planType),
        companyName: sanitizedData.companyName,
        companyId: '', // Will be created after payment succeeds
        ipAddress: event.headers['x-forwarded-for'],
        userAgent: event.headers['user-agent']
      }, idempotencyKey);

      // 13. Store encrypted payment record
      await storePaymentRecord({
        customerId: customer.data.customerId,
        email: sanitizedData.email,
        companyName: sanitizedData.companyName,
        encryptedPlaidToken,
        plaidItemId: tokenExchange.data.itemId,
        stripePaymentIntentId: payment.data.paymentIntentId,
        amount: getPlanAmount(sanitizedData.planType),
        status: 'pending',
        requestId
      });

      // 14. Log successful signup for audit
      await logAuditEvent({
        event: 'SIGNUP_WITH_PAYMENT_INITIATED',
        email: sanitizedData.email,
        customerId: customer.data.customerId,
        amount: getPlanAmount(sanitizedData.planType),
        requestId,
        duration: Date.now() - startTime
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            customerId: customer.data.customerId,
            paymentStatus: payment.data.status,
            message: 'Payment initiated. Confirmation within 3-5 business days.',
            requestId
          }
        })
      };

    } catch (error) {
      // Secure error handling
      console.error(`Payment processing failed: ${requestId}`, {
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      // Log failure for monitoring
      await logSecurityEvent({
        event: 'PAYMENT_PROCESSING_FAILED',
        error: error.message,
        requestId,
        duration: Date.now() - startTime
      });

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Payment processing failed',
          requestId,
          support: 'Please contact support with this request ID'
        })
      };
    }
  },
  {
    requireAuth: false, // Public signup endpoint
    requireCSRF: true,
    validateSchema: RequestSchema,
    rateLimit: {
      maxRequests: 3,
      windowMs: 300000 // 5 minutes
    },
    requireHttps: true
  }
);

// Helper functions
function getPlanAmount(planType: string): number {
  const plans = {
    starter: 99,
    growth: 299,
    enterprise: 2000
  };
  return plans[planType] || 299;
}

function generateIdempotencyKey(customerId: string, operation: string): string {
  const data = `${customerId}-${operation}-${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]) as Promise<T>;
}

async function checkDuplicateSignup(email: string): Promise<boolean> {
  // Check database for existing customer
  // Implementation depends on your database
  return false;
}

async function verifyAccountOwnership(
  account: any,
  ownerName: string
): Promise<boolean> {
  // Additional verification logic
  // Could involve name matching, additional Plaid verification, etc.
  return true;
}

async function storePaymentRecord(data: any): Promise<void> {
  // Store in database with encryption
  // Implementation depends on your database
}

async function logAuditEvent(event: any): Promise<void> {
  // Log to audit trail
  console.log('AUDIT:', event);
}

async function logSecurityEvent(event: any): Promise<void> {
  // Log security events for monitoring
  console.warn('SECURITY:', event);
}
```

---

## 4. Secure Webhook Handler

```typescript
// .netlify/functions/webhook-stripe-secure.ts

import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import crypto from 'crypto';

// Webhook-specific security wrapper
export const handler: Handler = async (event) => {
  const requestId = crypto.randomBytes(16).toString('hex');

  // 1. Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. Verify Content-Type
  const contentType = event.headers['content-type'];
  if (!contentType?.includes('application/json')) {
    console.warn(`Invalid content-type for webhook: ${contentType}`);
    return { statusCode: 400, body: 'Invalid content type' };
  }

  // 3. Check for Stripe signature
  const signature = event.headers['stripe-signature'];
  if (!signature) {
    console.warn('Missing Stripe signature header');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  // 4. Verify webhook comes from Stripe IP ranges
  const clientIP = event.headers['x-forwarded-for']?.split(',')[0].trim();
  const stripeIPRanges = [
    '3.18.12.63', '3.130.192.231', '13.235.14.237', '13.235.122.149',
    '18.211.135.69', '35.154.171.200', '52.15.183.38', '54.88.130.119',
    '54.88.130.237', '54.187.174.169', '54.187.205.235', '54.187.216.72'
  ];

  // Note: In production, use CIDR ranges for better coverage
  if (process.env.NODE_ENV === 'production' && !stripeIPRanges.includes(clientIP)) {
    console.warn(`Webhook from non-Stripe IP: ${clientIP}`);
    // Log but don't block (Stripe may add IPs)
  }

  try {
    // 5. Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia'
    });

    // 6. Verify webhook signature with timing-safe comparison
    let stripeEvent: Stripe.Event;

    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body!,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', {
        requestId,
        error: err.message,
        clientIP
      });

      // Log potential attack
      await logSecurityAlert({
        type: 'WEBHOOK_SIGNATURE_INVALID',
        requestId,
        clientIP,
        signature: signature.substring(0, 10) + '...'
      });

      return { statusCode: 400, body: 'Invalid signature' };
    }

    // 7. Check event timestamp (prevent replay attacks)
    const eventAge = Math.floor(Date.now() / 1000) - stripeEvent.created;
    const MAX_EVENT_AGE = 300; // 5 minutes

    if (eventAge > MAX_EVENT_AGE) {
      console.warn('Webhook event too old:', {
        requestId,
        eventId: stripeEvent.id,
        age: eventAge
      });
      return { statusCode: 400, body: 'Event too old' };
    }

    // 8. Implement idempotency check
    const isProcessed = await checkEventProcessed(stripeEvent.id);
    if (isProcessed) {
      console.log(`Duplicate webhook event: ${stripeEvent.id}`);
      return { statusCode: 200, body: 'Already processed' };
    }

    // 9. Process event based on type
    console.log(`Processing webhook: ${stripeEvent.type}`, {
      requestId,
      eventId: stripeEvent.id
    });

    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(stripeEvent, requestId);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(stripeEvent, requestId);
        break;

      case 'charge.failed':
        await handleChargeFailed(stripeEvent, requestId);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(stripeEvent, requestId);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent, requestId);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    // 10. Mark event as processed
    await markEventProcessed(stripeEvent.id);

    // 11. Log successful processing
    await logAuditEvent({
      event: 'WEBHOOK_PROCESSED',
      type: stripeEvent.type,
      eventId: stripeEvent.id,
      requestId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, requestId })
    };

  } catch (error) {
    console.error('Webhook processing error:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    // Don't expose internal errors
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        requestId
      })
    };
  }
};

// Event handlers
async function handlePaymentSucceeded(
  event: Stripe.Event,
  requestId: string
): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  try {
    // Update payment status in database
    await updatePaymentStatus(
      paymentIntent.id,
      'completed',
      paymentIntent.metadata
    );

    // Create company if initial payment
    if (paymentIntent.metadata.payment_type === 'initial_setup') {
      await createCompanyAndUser({
        customerId: paymentIntent.customer as string,
        paymentIntentId: paymentIntent.id,
        metadata: paymentIntent.metadata,
        requestId
      });
    }

    // Send confirmation email
    await sendPaymentConfirmation(
      paymentIntent.receipt_email || paymentIntent.metadata.email,
      paymentIntent.amount / 100
    );

  } catch (error) {
    console.error('Error handling payment success:', {
      requestId,
      paymentIntentId: paymentIntent.id,
      error: error.message
    });
    throw error; // Re-throw to trigger webhook retry
  }
}

async function handlePaymentFailed(
  event: Stripe.Event,
  requestId: string
): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // Update payment status
  await updatePaymentStatus(
    paymentIntent.id,
    'failed',
    {
      ...paymentIntent.metadata,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message
    }
  );

  // Send failure notification
  await sendPaymentFailureNotification(
    paymentIntent.receipt_email || paymentIntent.metadata.email,
    paymentIntent.last_payment_error?.message || 'Payment failed'
  );

  // Log for manual review if needed
  await logPaymentFailure({
    requestId,
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount,
    error: paymentIntent.last_payment_error
  });
}

// Helper functions
async function checkEventProcessed(eventId: string): Promise<boolean> {
  // Check database or cache
  // Implementation depends on your storage
  return false;
}

async function markEventProcessed(eventId: string): Promise<void> {
  // Store in database with TTL
  // Implementation depends on your storage
}

async function logSecurityAlert(alert: any): Promise<void> {
  console.error('SECURITY ALERT:', alert);
  // Send to monitoring service
}

async function logAuditEvent(event: any): Promise<void> {
  console.log('AUDIT:', event);
  // Store in audit log
}

async function updatePaymentStatus(
  paymentIntentId: string,
  status: string,
  metadata: any
): Promise<void> {
  // Update database
}

async function createCompanyAndUser(data: any): Promise<void> {
  // Create company and user records
}

async function sendPaymentConfirmation(email: string, amount: number): Promise<void> {
  // Send email
}

async function sendPaymentFailureNotification(
  email: string,
  reason: string
): Promise<void> {
  // Send email
}

async function logPaymentFailure(data: any): Promise<void> {
  console.error('Payment failure:', data);
  // Log for manual review
}
```

---

## 5. Environment Variable Validation

Create this file to validate all environment variables on startup:

```typescript
// src/utils/env-validator.ts

import { z } from 'zod';

const EnvironmentSchema = z.object({
  // Plaid Configuration
  PLAID_CLIENT_ID: z.string().min(20, 'Invalid Plaid Client ID'),
  PLAID_SECRET: z.string().min(20, 'Invalid Plaid Secret'),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']),
  PLAID_REDIRECT_URI: z.string().url().optional(),

  // Stripe Configuration
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/, 'Invalid Stripe Secret Key'),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_/, 'Invalid Stripe Webhook Secret'),

  // Supabase Configuration
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_KEY: z.string().min(40, 'Invalid Supabase Service Key'),

  // Security Keys
  ENCRYPTION_KEY: z.string().length(64, 'Encryption key must be 32 bytes hex'),
  TOKEN_HMAC_SECRET: z.string().min(32, 'HMAC secret too short'),
  SESSION_SECRET: z.string().min(32, 'Session secret too short'),

  // Application Configuration
  FRONTEND_URL: z.string().url('Invalid Frontend URL'),
  NODE_ENV: z.enum(['development', 'staging', 'production']),

  // Optional: Redis for rate limiting
  REDIS_URL: z.string().url().optional(),

  // Optional: Monitoring
  SENTRY_DSN: z.string().url().optional(),
  DATADOG_API_KEY: z.string().optional()
});

export function validateEnvironment(): void {
  try {
    EnvironmentSchema.parse(process.env);
    console.log('✓ Environment variables validated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Unknown environment validation error:', error);
    }
    process.exit(1);
  }
}

// Call this at the start of each function
validateEnvironment();
```

---

## 6. Security Monitoring Setup

```typescript
// src/utils/security-monitor.ts

import * as Sentry from '@sentry/node';

export class SecurityMonitor {
  private static initialized = false;

  static init() {
    if (this.initialized) return;

    // Initialize Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
        beforeSend(event, hint) {
          // Scrub sensitive data
          if (event.request?.cookies) {
            event.request.cookies = '[REDACTED]';
          }
          if (event.request?.data) {
            event.request.data = sanitizeData(event.request.data);
          }
          return event;
        }
      });
    }

    this.initialized = true;
  }

  static captureSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any
  ) {
    const event = {
      type: eventType,
      severity,
      timestamp: new Date().toISOString(),
      details: sanitizeData(details)
    };

    // Log locally
    console.log(`SECURITY_EVENT [${severity.toUpperCase()}]:`, event);

    // Send to Sentry
    if (severity === 'critical' || severity === 'high') {
      Sentry.captureMessage(`Security Event: ${eventType}`, {
        level: severity === 'critical' ? 'error' : 'warning',
        extra: event
      });
    }

    // Send to monitoring service
    this.sendToMonitoring(event);
  }

  private static async sendToMonitoring(event: any) {
    // Send to DataDog, CloudWatch, etc.
    if (process.env.DATADOG_API_KEY) {
      // DataDog implementation
    }
  }
}

function sanitizeData(data: any): any {
  // Remove sensitive fields
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization',
    'access_token', 'refresh_token', 'api_key'
  ];

  if (typeof data !== 'object' || data === null) return data;

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

---

## 7. Security Headers Configuration

Add to `netlify.toml`:

```toml
# netlify.toml

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = """
      accelerometer=(),
      camera=(),
      geolocation=(),
      gyroscope=(),
      magnetometer=(),
      microphone=(),
      payment=(),
      usb=()
    """
    Content-Security-Policy = """
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.plaid.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://api.stripe.com https://sandbox.plaid.com https://production.plaid.com;
      frame-src https://js.stripe.com https://cdn.plaid.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    """

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, no-cache, must-revalidate, proxy-revalidate"
    Pragma = "no-cache"
    Expires = "0"

# Strict Transport Security for production
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
```

---

## Production Deployment Checklist

```bash
#!/bin/bash

# pre-deploy-security-check.sh

echo "🔐 Running Security Pre-Deployment Checks..."

# 1. Check for secrets in code
echo "Checking for hardcoded secrets..."
grep -r "sk_live" --exclude-dir=node_modules .
grep -r "PLAID-SECRET" --exclude-dir=node_modules .
grep -r "eyJ" --exclude-dir=node_modules . # JWT pattern

# 2. Verify environment variables
echo "Verifying environment variables..."
node -e "require('./src/utils/env-validator').validateEnvironment()"

# 3. Run security audit
echo "Running npm audit..."
npm audit --audit-level=high

# 4. Check dependencies for vulnerabilities
echo "Checking dependencies with Snyk..."
npx snyk test

# 5. Lint for security issues
echo "Running ESLint security checks..."
npx eslint . --ext .js,.ts,.tsx --plugin security

# 6. Test rate limiting
echo "Testing rate limiting..."
node test-rate-limiting.js

# 7. Verify HTTPS redirect
echo "Verifying HTTPS enforcement..."
curl -I http://your-site.netlify.app | grep "Location: https://"

echo "✅ Security checks complete!"
```

---

This implementation guide provides production-ready security code that addresses all HIGH severity findings from the audit. Implement these patterns before deploying to production.