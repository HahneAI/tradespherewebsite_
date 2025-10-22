# Stripe ACH + Plaid Integration Architecture

## Executive Summary

This document defines the complete architecture for migrating from Dwolla ACH payments to Stripe ACH with Plaid Link for instant bank verification. The new system eliminates the 1-3 day micro-deposit verification wait, providing instant bank account verification and improved user experience.

### Key Improvements
- **Instant Verification**: Plaid Link provides immediate bank account verification
- **Better UX**: Modern, familiar banking UI that users trust
- **Reduced Friction**: No waiting for micro-deposits, immediate payment processing
- **Enhanced Security**: Bank-grade authentication through Plaid
- **Better Error Recovery**: More granular error handling and retry capabilities

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  1. User initiates signup                                       │
│  2. Calls /api/plaid-link-token to get Link token              │
│  3. Opens Plaid Link modal                                      │
│  4. User authenticates with bank                                │
│  5. Receives public_token on success                            │
│  6. Sends public_token to /api/signup-with-payment             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Netlify Functions (Backend)                    │
├─────────────────────────────────────────────────────────────────┤
│  PlaidService                │  StripeService                   │
│  ├─ createLinkToken()        │  ├─ createCustomer()            │
│  ├─ exchangePublicToken()    │  ├─ createPaymentMethod()       │
│  ├─ createProcessorToken()   │  ├─ attachPaymentMethod()       │
│  └─ getAccountDetails()      │  ├─ createPaymentIntent()       │
│                              │  ├─ confirmPayment()            │
│                              │  └─ createSubscription()        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                            │
├─────────────────────────────────────────────────────────────────┤
│  Plaid API                   │  Stripe API                      │
│  ├─ Link Token               │  ├─ Customers                   │
│  ├─ Item/Access Token        │  ├─ Payment Methods (ACH)       │
│  └─ Processor Token          │  ├─ Payment Intents             │
│                              │  └─ Subscriptions                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Webhook Handlers                            │
├─────────────────────────────────────────────────────────────────┤
│  /api/webhook-stripe         │  /api/webhook-plaid (optional)   │
│  ├─ payment_intent.succeeded │  ├─ ITEM_WEBHOOK               │
│  ├─ payment_intent.failed    │  └─ TRANSACTIONS_WEBHOOK       │
│  ├─ charge.succeeded         │                                  │
│  └─ charge.failed           │                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Service Architecture

### 1.1 PlaidService Class

```typescript
// src/services/PlaidService.ts

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import type {
  LinkTokenCreateRequest,
  LinkTokenCreateResponse,
  ItemPublicTokenExchangeRequest,
  ProcessorStripeBankAccountTokenCreateRequest,
  AccountsGetRequest,
  Account,
  PlaidError as PlaidApiError
} from 'plaid';

/**
 * PlaidService - Handles Plaid Link integration for instant bank verification
 *
 * SECURITY: This service must ONLY be used server-side (Netlify functions)
 * Never expose Plaid secret key to the frontend
 */
export class PlaidService {
  private plaidClient: PlaidApi;
  private static instance: PlaidService;

  private constructor() {
    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
  }

  public static getInstance(): PlaidService {
    if (!PlaidService.instance) {
      PlaidService.instance = new PlaidService();
    }
    return PlaidService.instance;
  }

  /**
   * Create a Link token for initializing Plaid Link
   * This token is used client-side to open the Plaid Link modal
   */
  async createLinkToken(params: {
    userId: string;
    companyName: string;
  }): Promise<ServiceResponse<LinkTokenCreateResponse>> {
    try {
      const request: LinkTokenCreateRequest = {
        client_id: process.env.PLAID_CLIENT_ID!,
        secret: process.env.PLAID_SECRET!,
        user: {
          client_user_id: params.userId,
        },
        client_name: 'Tradesphere',
        products: ['auth'], // Required for ACH
        country_codes: ['US'],
        language: 'en',
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings'],
          },
        },
        redirect_uri: process.env.PLAID_REDIRECT_URI, // Optional
      };

      const response = await this.plaidClient.linkTokenCreate(request);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Exchange public_token from Link for permanent access_token
   * Public token expires after 30 minutes, must exchange immediately
   */
  async exchangePublicToken(publicToken: string): Promise<ServiceResponse<{
    accessToken: string;
    itemId: string;
  }>> {
    try {
      const request: ItemPublicTokenExchangeRequest = {
        public_token: publicToken,
      };

      const response = await this.plaidClient.itemPublicTokenExchange(request);

      return {
        success: true,
        data: {
          accessToken: response.data.access_token,
          itemId: response.data.item_id,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create Stripe processor token for ACH payment processing
   * This token is used with Stripe to create payment methods
   */
  async createProcessorToken(params: {
    accessToken: string;
    accountId: string;
  }): Promise<ServiceResponse<{ processorToken: string }>> {
    try {
      const request: ProcessorStripeBankAccountTokenCreateRequest = {
        access_token: params.accessToken,
        account_id: params.accountId,
      };

      const response = await this.plaidClient.processorStripeBankAccountTokenCreate(request);

      return {
        success: true,
        data: {
          processorToken: response.data.stripe_bank_account_token,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get account details for verification and display
   */
  async getAccountDetails(accessToken: string): Promise<ServiceResponse<{
    accounts: Account[];
  }>> {
    try {
      const request: AccountsGetRequest = {
        access_token: accessToken,
      };

      const response = await this.plaidClient.accountsGet(request);

      return {
        success: true,
        data: {
          accounts: response.data.accounts,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Invalidate an access token (for security or user request)
   */
  async removeItem(accessToken: string): Promise<ServiceResponse<void>> {
    try {
      await this.plaidClient.itemRemove({
        access_token: accessToken,
      });

      return { success: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: any): ServiceResponse<any> {
    console.error('Plaid API Error:', error);

    let errorMessage = 'An error occurred with bank verification';
    let errorCode = 'PLAID_ERROR';
    let userMessage = 'Unable to verify bank account. Please try again.';

    if (error.response?.data) {
      const plaidError = error.response.data as PlaidApiError;
      errorCode = plaidError.error_code || errorCode;
      errorMessage = plaidError.error_message || errorMessage;

      // User-friendly messages for common errors
      switch (errorCode) {
        case 'ITEM_LOGIN_REQUIRED':
          userMessage = 'Please log in to your bank account again.';
          break;
        case 'INSUFFICIENT_CREDENTIALS':
          userMessage = 'Additional authentication required. Please complete verification.';
          break;
        case 'INVALID_CREDENTIALS':
          userMessage = 'Invalid bank credentials. Please check and try again.';
          break;
        case 'RATE_LIMIT_EXCEEDED':
          userMessage = 'Too many attempts. Please wait a moment and try again.';
          break;
      }
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        userMessage,
      },
    };
  }
}
```

### 1.2 StripeService Class

```typescript
// src/services/StripeService.ts

import Stripe from 'stripe';
import type {
  ServiceResponse,
  CreateCustomerParams,
  CreatePaymentParams,
  SubscriptionParams
} from '../types/payment';

/**
 * StripeService - Handles Stripe ACH payment processing
 *
 * SECURITY: This service must ONLY be used server-side
 * Never expose Stripe secret key to the frontend
 */
export class StripeService {
  private stripe: Stripe;
  private static instance: StripeService;

  private constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key not configured');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia', // Use latest API version
      typescript: true,
    });
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Create a Stripe customer for the company
   */
  async createCustomer(params: CreateCustomerParams): Promise<ServiceResponse<{
    customerId: string;
    customer: Stripe.Customer;
  }>> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.companyName,
        metadata: {
          company_id: params.companyId || '',
          owner_name: params.ownerName,
          source: 'website_signup',
          created_via: 'plaid_link',
        },
        description: `${params.companyName} - Field Service Company`,
      });

      return {
        success: true,
        data: {
          customerId: customer.id,
          customer,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create ACH payment method using Plaid processor token
   */
  async createPaymentMethod(params: {
    customerId: string;
    processorToken: string;
  }): Promise<ServiceResponse<{
    paymentMethodId: string;
    paymentMethod: Stripe.PaymentMethod;
  }>> {
    try {
      // Create bank account from Plaid token
      const bankAccount = await this.stripe.customers.createSource(params.customerId, {
        source: params.processorToken,
      });

      // Create payment method from bank account
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'us_bank_account',
        us_bank_account: {
          account_holder_type: 'company',
          // Bank details are automatically populated from processor token
        },
        customer: params.customerId,
      });

      // Attach to customer as default
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: params.customerId,
      });

      // Set as default payment method
      await this.stripe.customers.update(params.customerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      return {
        success: true,
        data: {
          paymentMethodId: paymentMethod.id,
          paymentMethod,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create and confirm ACH payment (one-time or initial payment)
   */
  async createPayment(params: CreatePaymentParams): Promise<ServiceResponse<{
    paymentIntentId: string;
    status: string;
    clientSecret: string;
  }>> {
    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: 'usd',
        customer: params.customerId,
        payment_method: params.paymentMethodId,
        payment_method_types: ['us_bank_account'],
        confirm: true, // Automatically confirm
        mandate_data: {
          customer_acceptance: {
            type: 'online',
            online: {
              ip_address: params.ipAddress || '',
              user_agent: params.userAgent || '',
            },
          },
        },
        metadata: {
          company_id: params.companyId,
          invoice_id: params.invoiceId || '',
          billing_period: params.billingPeriod || '',
          payment_type: 'initial_setup',
        },
        description: `Tradesphere subscription - ${params.companyName}`,
        statement_descriptor: 'TRADESPHERE SUB',
        setup_future_usage: 'off_session', // Save for future payments
      });

      return {
        success: true,
        data: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          clientSecret: paymentIntent.client_secret || '',
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create recurring subscription
   */
  async createSubscription(params: SubscriptionParams): Promise<ServiceResponse<{
    subscriptionId: string;
    subscription: Stripe.Subscription;
  }>> {
    try {
      // First, ensure price exists or create it
      const priceId = await this.ensurePrice(params.amount, params.interval || 'month');

      const subscription = await this.stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['us_bank_account'],
          save_default_payment_method: 'on_subscription',
        },
        metadata: {
          company_id: params.companyId,
          plan_type: params.planType || 'standard',
        },
        description: `Tradesphere ${params.planType || 'Standard'} Plan`,
        // ACH payments can take 3-5 days, set appropriate trial
        trial_period_days: params.trialDays || 0,
        // Set billing anchor to specific day of month if needed
        billing_cycle_anchor: params.billingAnchor,
      });

      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
          subscription,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<ServiceResponse<void>> {
    try {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      return { success: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Verify webhook signature for security
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event | null {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-11-20.acacia',
      });

      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return null;
    }
  }

  /**
   * Ensure a price exists for the subscription amount
   */
  private async ensurePrice(amount: number, interval: 'month' | 'year'): Promise<string> {
    const amountInCents = Math.round(amount * 100);

    // Check if price already exists
    const prices = await this.stripe.prices.list({
      currency: 'usd',
      recurring: { interval },
      active: true,
      limit: 100,
    });

    const existingPrice = prices.data.find(
      p => p.unit_amount === amountInCents &&
           p.recurring?.interval === interval
    );

    if (existingPrice) {
      return existingPrice.id;
    }

    // Create new price
    const price = await this.stripe.prices.create({
      currency: 'usd',
      unit_amount: amountInCents,
      recurring: { interval },
      product_data: {
        name: `Tradesphere Subscription - $${amount}/${interval}`,
        metadata: {
          amount: amount.toString(),
          interval,
        },
      },
    });

    return price.id;
  }

  private handleError(error: any): ServiceResponse<any> {
    console.error('Stripe API Error:', error);

    let errorMessage = 'Payment processing error';
    let errorCode = 'STRIPE_ERROR';
    let userMessage = 'Unable to process payment. Please try again.';

    if (error instanceof Stripe.errors.StripeError) {
      errorCode = error.code || errorCode;
      errorMessage = error.message;

      switch (error.type) {
        case 'StripeCardError':
          userMessage = error.message; // User-friendly message from Stripe
          break;
        case 'StripeRateLimitError':
          userMessage = 'Too many requests. Please try again later.';
          break;
        case 'StripeInvalidRequestError':
          userMessage = 'Invalid payment information. Please check and try again.';
          break;
        case 'StripeAPIError':
          userMessage = 'Payment service temporarily unavailable. Please try again.';
          break;
        case 'StripeConnectionError':
          userMessage = 'Network error. Please check your connection and try again.';
          break;
        case 'StripeAuthenticationError':
          errorMessage = 'API authentication failed';
          userMessage = 'Configuration error. Please contact support.';
          break;
      }
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        userMessage,
      },
    };
  }
}
```

---

## 2. Payment Flow Design

### 2.1 Complete Payment Flow Sequence

```
User Registration & Payment Flow
═════════════════════════════════════════════════════════════════

1. USER INITIATES SIGNUP
   Frontend: SignupForm.tsx
   └─> Collects: email, company name, owner name, plan selection

2. CREATE PLAID LINK TOKEN
   Frontend                          Backend
   └─> POST /api/plaid-link-token ──> PlaidService.createLinkToken()
                                       └─> Returns: link_token

3. OPEN PLAID LINK
   Frontend: PlaidLink component
   └─> Plaid.create({ token: link_token })
   └─> User selects bank
   └─> User authenticates (credentials/OAuth)
   └─> User selects account (checking/savings)
   └─> Returns: public_token, metadata

4. PROCESS SIGNUP WITH PAYMENT
   Frontend                          Backend
   └─> POST /api/signup-with-payment ──> signup-with-payment.ts
       {                                  │
         email,                           ├─> PlaidService.exchangePublicToken()
         companyName,                     │   └─> Returns: access_token
         ownerName,                       │
         publicToken,                     ├─> PlaidService.getAccountDetails()
         accountId                        │   └─> Returns: account info
       }                                  │
                                         ├─> PlaidService.createProcessorToken()
                                         │   └─> Returns: processor_token
                                         │
                                         ├─> StripeService.createCustomer()
                                         │   └─> Returns: customer_id
                                         │
                                         ├─> StripeService.createPaymentMethod()
                                         │   └─> Returns: payment_method_id
                                         │
                                         ├─> StripeService.createPayment()
                                         │   └─> Returns: payment_intent_id
                                         │
                                         ├─> Database: Create payment record
                                         │   └─> Status: 'pending'
                                         │
                                         └─> Returns: success, payment details

5. PAYMENT PROCESSING (Async, 3-5 days for ACH)
   Stripe processes ACH transfer
   └─> Webhook: payment_intent.succeeded

6. WEBHOOK HANDLING
   Stripe                            Backend
   └─> POST /api/webhook-stripe ───> webhook-stripe.ts
                                     ├─> Verify signature
                                     ├─> Update payment status
                                     ├─> Create company (if payment succeeded)
                                     ├─> Create Supabase auth user
                                     ├─> Send welcome email
                                     └─> Activate subscription

7. USER ACCESS
   User receives welcome email with credentials
   └─> Can now log in to Tradesphere app
```

### 2.2 Error Recovery Flow

```
Error Handling & Recovery Scenarios
═══════════════════════════════════════════════════════════════════

SCENARIO 1: Plaid Link Failure
├─> User can't authenticate with bank
├─> FALLBACK: Manual bank account entry
│   ├─> Collect: routing number, account number
│   ├─> Stripe: Create bank account token manually
│   └─> Continue with payment flow
└─> Log: Plaid failure for debugging

SCENARIO 2: Payment Method Creation Failure
├─> Processor token invalid/expired
├─> RECOVERY:
│   ├─> Prompt user to re-authenticate with Plaid
│   ├─> Generate new public_token
│   └─> Retry payment method creation
└─> Max retries: 3

SCENARIO 3: Payment Intent Failure
├─> Insufficient funds / Invalid account
├─> RECOVERY:
│   ├─> Notify user via email
│   ├─> Provide link to update payment method
│   ├─> Retry payment after 24 hours
│   └─> Max retries: 2
└─> After max retries: Manual intervention required

SCENARIO 4: Webhook Delivery Failure
├─> Network issues / Endpoint down
├─> Stripe automatic retry:
│   ├─> Exponential backoff
│   ├─> Up to 3 days
│   └─> Email notification after multiple failures
└─> Manual reconciliation via Stripe Dashboard
```

---

## 3. Webhook Architecture

### 3.1 Stripe Webhook Events

```typescript
// .netlify/functions/webhook-stripe.ts

import { StripeService } from '../../src/services/StripeService';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

const WEBHOOK_EVENTS = {
  // Payment Events
  'payment_intent.succeeded': handlePaymentSucceeded,
  'payment_intent.payment_failed': handlePaymentFailed,
  'payment_intent.requires_action': handlePaymentRequiresAction,

  // Charge Events (for ACH specific)
  'charge.succeeded': handleChargeSucceeded,
  'charge.failed': handleChargeFailed,

  // Subscription Events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Payment Method Events
  'payment_method.attached': handlePaymentMethodAttached,
  'payment_method.detached': handlePaymentMethodDetached,

  // Customer Events
  'customer.updated': handleCustomerUpdated,
  'customer.deleted': handleCustomerDeleted,
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verify webhook signature
  const signature = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return { statusCode: 400, body: 'Invalid request' };
  }

  const stripeEvent = StripeService.verifyWebhookSignature(
    event.body,
    signature,
    webhookSecret
  );

  if (!stripeEvent) {
    return { statusCode: 400, body: 'Invalid signature' };
  }

  // Handle event
  const handler = WEBHOOK_EVENTS[stripeEvent.type];
  if (handler) {
    try {
      await handler(stripeEvent);
    } catch (error) {
      console.error(`Error handling ${stripeEvent.type}:`, error);
      // Return 200 to prevent retries for handler errors
      // Log to monitoring system for manual review
    }
  } else {
    console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  // Always return 200 to acknowledge receipt
  return { statusCode: 200, body: 'OK' };
};

async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'completed',
      stripe_payment_intent_id: paymentIntent.id,
      completed_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', paymentIntent.customer)
    .eq('status', 'pending');

  // Trigger company creation if this is initial payment
  if (paymentIntent.metadata.payment_type === 'initial_setup') {
    await createCompanyAndUser({
      customerId: paymentIntent.customer as string,
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
    });
  }
}

// Additional handler implementations...
```

### 3.2 Idempotency & Retry Logic

```typescript
// src/utils/idempotency.ts

export class IdempotencyService {
  private static readonly CACHE_TTL = 86400; // 24 hours in seconds

  /**
   * Generate idempotency key for payment operations
   */
  static generateKey(params: {
    operation: string;
    customerId: string;
    timestamp?: number;
  }): string {
    const timestamp = params.timestamp || Date.now();
    const data = `${params.operation}-${params.customerId}-${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check if operation was already processed
   */
  static async checkProcessed(
    supabase: SupabaseClient,
    key: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('idempotency_keys')
      .select('id')
      .eq('key', key)
      .single();

    return !!data;
  }

  /**
   * Mark operation as processed
   */
  static async markProcessed(
    supabase: SupabaseClient,
    key: string,
    result: any
  ): Promise<void> {
    await supabase.from('idempotency_keys').insert({
      key,
      result: JSON.stringify(result),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.CACHE_TTL * 1000).toISOString(),
    });
  }
}

// Usage in payment function
export async function processPaymentWithIdempotency(params: PaymentParams) {
  const idempotencyKey = IdempotencyService.generateKey({
    operation: 'create_payment',
    customerId: params.customerId,
  });

  // Check if already processed
  if (await IdempotencyService.checkProcessed(supabase, idempotencyKey)) {
    return { success: true, message: 'Payment already processed' };
  }

  // Process payment
  const result = await stripeService.createPayment(params);

  // Mark as processed
  await IdempotencyService.markProcessed(supabase, idempotencyKey, result);

  return result;
}
```

---

## 4. Security Design

### 4.1 API Key Management

```
Environment Variable Security Matrix
═══════════════════════════════════════════════════════════════════

┌─────────────────────────┬──────────┬───────────┬──────────────┐
│ Variable                │ Frontend │ Functions │ Storage      │
├─────────────────────────┼──────────┼───────────┼──────────────┤
│ PLAID_CLIENT_ID        │ ❌       │ ✅        │ Netlify Env  │
│ PLAID_SECRET           │ ❌       │ ✅        │ Netlify Env  │
│ PLAID_PUBLIC_KEY       │ ✅       │ ❌        │ Build Time   │
│ STRIPE_SECRET_KEY      │ ❌       │ ✅        │ Netlify Env  │
│ STRIPE_PUBLISHABLE_KEY │ ✅       │ ❌        │ Build Time   │
│ STRIPE_WEBHOOK_SECRET  │ ❌       │ ✅        │ Netlify Env  │
│ SUPABASE_URL          │ ✅       │ ✅        │ Build Time   │
│ SUPABASE_ANON_KEY     │ ✅       │ ❌        │ Build Time   │
│ SUPABASE_SERVICE_KEY   │ ❌       │ ✅        │ Netlify Env  │
└─────────────────────────┴──────────┴───────────┴──────────────┘

✅ = Accessible
❌ = Not Accessible (Security)
```

### 4.2 Token Flow Security

```typescript
// Token Security Flow
interface TokenSecurity {
  // 1. Plaid Link Token (Frontend → Backend → Frontend)
  linkToken: {
    createdBy: 'Backend (PlaidService)';
    usedBy: 'Frontend (Plaid Link)';
    expiresIn: '30 minutes';
    sensitive: false; // Safe for frontend
  };

  // 2. Plaid Public Token (Frontend → Backend)
  publicToken: {
    createdBy: 'Plaid Link (Frontend)';
    sentTo: 'Backend only';
    expiresIn: '30 minutes';
    sensitive: true; // Must exchange quickly
    storage: 'Never stored, exchanged immediately';
  };

  // 3. Plaid Access Token (Backend only)
  accessToken: {
    createdBy: 'Backend (token exchange)';
    usedBy: 'Backend only';
    expiresIn: 'Never (until revoked)';
    sensitive: true; // CRITICAL - Never expose
    storage: 'Encrypted in database';
    usage: 'Get accounts, create processor tokens';
  };

  // 4. Stripe Processor Token (Backend only)
  processorToken: {
    createdBy: 'Backend (PlaidService)';
    usedBy: 'Backend (StripeService)';
    expiresIn: 'Single use';
    sensitive: true;
    storage: 'Never stored, used immediately';
  };

  // 5. Stripe Payment Intent Secret (Backend → Frontend)
  clientSecret: {
    createdBy: 'Backend (StripeService)';
    usedBy: 'Frontend (Stripe.js)';
    expiresIn: '24 hours';
    sensitive: false; // Safe for specific payment
    usage: 'Confirm payment on frontend if needed';
  };
}
```

### 4.3 Rate Limiting Strategy

```typescript
// src/middleware/rateLimiter.ts

interface RateLimitConfig {
  endpoints: {
    '/api/plaid-link-token': {
      windowMs: 60000,      // 1 minute
      maxRequests: 5,       // 5 requests per minute per IP
      skipSuccessful: false
    },
    '/api/signup-with-payment': {
      windowMs: 300000,     // 5 minutes
      maxRequests: 3,       // 3 attempts per 5 minutes
      skipSuccessful: true  // Don't count successful attempts
    },
    '/api/webhook-stripe': {
      windowMs: 1000,       // 1 second
      maxRequests: 10,      // 10 requests per second
      skipSuccessful: false,
      bypassForStripeIPs: true
    }
  }
}

export class RateLimiter {
  static async checkLimit(
    ip: string,
    endpoint: string,
    redis: RedisClient
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = RateLimitConfig.endpoints[endpoint];
    if (!config) return { allowed: true };

    const key = `rate:${endpoint}:${ip}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, Math.ceil(config.windowMs / 1000));
    }

    if (current > config.maxRequests) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfter: ttl };
    }

    return { allowed: true };
  }
}
```

---

## 5. Interface Contracts

### 5.1 TypeScript Interfaces

```typescript
// src/types/payment.ts

// ====== Service Response Types ======
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    userMessage?: string;
    details?: any;
  };
}

// ====== Plaid Types ======
export interface PlaidLinkTokenRequest {
  userId: string;
  companyName: string;
}

export interface PlaidLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeRequest {
  publicToken: string;
  accountId: string;
}

export interface PlaidAccountInfo {
  accountId: string;
  name: string;
  mask: string;
  type: 'depository' | 'credit' | 'loan' | 'investment';
  subtype: 'checking' | 'savings' | 'credit card' | string;
  verificationStatus?: 'verified' | 'pending' | 'failed';
}

// ====== Stripe Types ======
export interface StripeCustomerParams {
  email: string;
  companyName: string;
  ownerName: string;
  companyId?: string;
  metadata?: Record<string, string>;
}

export interface StripePaymentMethodParams {
  customerId: string;
  processorToken: string;
  setAsDefault?: boolean;
}

export interface StripePaymentParams {
  customerId: string;
  paymentMethodId: string;
  amount: number;
  companyId: string;
  companyName: string;
  invoiceId?: string;
  billingPeriod?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface StripeSubscriptionParams {
  customerId: string;
  amount: number;
  interval: 'month' | 'year';
  companyId: string;
  planType: 'starter' | 'growth' | 'enterprise';
  trialDays?: number;
  billingAnchor?: number;
}

// ====== API Request/Response Types ======
export interface SignupWithPaymentRequest {
  // Company info
  email: string;
  companyName: string;
  ownerName: string;
  phone?: string;

  // Plaid tokens
  publicToken: string;
  accountId: string;

  // Plan selection
  planType: 'starter' | 'growth' | 'enterprise';
  billingInterval: 'monthly' | 'yearly';

  // Tracking
  referralCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface SignupWithPaymentResponse {
  success: boolean;
  data?: {
    companyId: string;
    customerId: string;
    subscriptionId: string;
    paymentStatus: 'pending' | 'processing' | 'succeeded' | 'failed';
    nextSteps?: string;
  };
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

// ====== Webhook Types ======
export interface WebhookEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: any;
  };
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  error?: string;
}

// ====== Database Types ======
export interface PaymentRecord {
  id: string;
  company_id?: string;
  company_email: string;
  company_name: string;

  // Stripe IDs
  stripe_customer_id: string;
  stripe_payment_intent_id?: string;
  stripe_payment_method_id?: string;
  stripe_subscription_id?: string;

  // Plaid IDs
  plaid_item_id?: string;
  plaid_account_id?: string;

  // Payment details
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

  // Bank account details (for display)
  bank_name?: string;
  account_last4?: string;
  account_type?: 'checking' | 'savings';

  // Timestamps
  created_at: string;
  processed_at?: string;
  completed_at?: string;
  failed_at?: string;

  // Metadata
  metadata?: Record<string, any>;
  error_message?: string;
  error_code?: string;
}
```

---

## 6. Integration Points

### 6.1 Frontend Integration

```typescript
// src/components/PaymentFlow.tsx

import { usePlaidLink } from 'react-plaid-link';
import { useState } from 'react';

export function PaymentFlow({ onSuccess, onError }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Step 1: Get Plaid Link token
  const initializePlaid = async () => {
    try {
      const response = await fetch('/api/plaid-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'temp-user-id',
          companyName: formData.companyName,
        }),
      });

      const data = await response.json();
      setLinkToken(data.linkToken);
    } catch (error) {
      onError('Failed to initialize payment verification');
    }
  };

  // Step 2: Handle Plaid Link success
  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    setProcessing(true);

    try {
      const response = await fetch('/api/signup-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          publicToken,
          accountId: metadata.account_id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result.data);
      } else {
        onError(result.error.message);
      }
    } catch (error) {
      onError('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: (error, metadata) => {
      if (error) {
        onError('Bank verification cancelled');
      }
    },
  });

  return (
    <div>
      {/* Form fields */}
      <button
        onClick={() => linkToken ? open() : initializePlaid()}
        disabled={!ready || processing}
      >
        {processing ? 'Processing...' : 'Verify Bank & Pay'}
      </button>
    </div>
  );
}
```

### 6.2 Netlify Function Integration

```typescript
// .netlify/functions/signup-with-payment.ts

import { Handler } from '@netlify/functions';
import { PlaidService } from '../../src/services/PlaidService';
import { StripeService } from '../../src/services/StripeService';
import { z } from 'zod';

const RequestSchema = z.object({
  email: z.string().email(),
  companyName: z.string().min(2),
  ownerName: z.string().min(2),
  publicToken: z.string(),
  accountId: z.string(),
  planType: z.enum(['starter', 'growth', 'enterprise']),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Validate request
    const data = RequestSchema.parse(JSON.parse(event.body));

    // Initialize services
    const plaid = PlaidService.getInstance();
    const stripe = StripeService.getInstance();

    // Exchange public token for access token
    const { data: tokenData } = await plaid.exchangePublicToken(
      data.publicToken
    );

    if (!tokenData) {
      throw new Error('Failed to verify bank account');
    }

    // Get account details for verification
    const { data: accountData } = await plaid.getAccountDetails(
      tokenData.accessToken
    );

    // Create processor token for Stripe
    const { data: processorData } = await plaid.createProcessorToken({
      accessToken: tokenData.accessToken,
      accountId: data.accountId,
    });

    // Create Stripe customer
    const { data: customerData } = await stripe.createCustomer({
      email: data.email,
      companyName: data.companyName,
      ownerName: data.ownerName,
    });

    // Create payment method
    const { data: paymentMethodData } = await stripe.createPaymentMethod({
      customerId: customerData.customerId,
      processorToken: processorData.processorToken,
    });

    // Create payment or subscription based on plan
    const amount = getPlanAmount(data.planType);

    const { data: paymentData } = await stripe.createPayment({
      customerId: customerData.customerId,
      paymentMethodId: paymentMethodData.paymentMethodId,
      amount,
      companyId: '', // Will be created after payment succeeds
      companyName: data.companyName,
    });

    // Save to database (payment record)
    // ... database logic here ...

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          customerId: customerData.customerId,
          paymentStatus: paymentData.status,
          message: 'Payment initiated. You will receive confirmation within 3-5 business days.',
        },
      }),
    };
  } catch (error) {
    console.error('Signup with payment error:', error);

    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: {
          message: 'Failed to process signup',
        },
      }),
    };
  }
};

function getPlanAmount(planType: string): number {
  const plans = {
    starter: 99,
    growth: 299,
    enterprise: 2000,
  };
  return plans[planType] || 299;
}
```

---

## 7. Database Schema Requirements

### 7.1 Required Fields (Document for Backend Team)

```sql
-- Additional fields needed in existing tables

-- payments table additions
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plaid_item_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plaid_account_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_last4 VARCHAR(4);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_type VARCHAR(20);

-- companies table additions
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plaid_item_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX idx_payments_stripe_customer_id ON payments(stripe_customer_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_companies_stripe_customer_id ON companies(stripe_customer_id);

-- Idempotency keys table (new)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
```

---

## 8. Migration Strategy

### 8.1 Migration from Dwolla

```typescript
// Migration considerations and parallel running strategy

interface MigrationStrategy {
  phases: {
    phase1: {
      name: 'Parallel Running';
      duration: '2 weeks';
      approach: [
        'Keep Dwolla service active',
        'Add feature flag for payment provider',
        'Route new customers to Stripe/Plaid',
        'Existing customers continue with Dwolla'
      ];
    };

    phase2: {
      name: 'Migration of Existing';
      duration: '4 weeks';
      approach: [
        'Email existing customers about change',
        'Provide UI to update payment method',
        'Use Plaid Link for re-verification',
        'Migrate subscriptions to Stripe'
      ];
    };

    phase3: {
      name: 'Dwolla Sunset';
      duration: '2 weeks';
      approach: [
        'Stop accepting new Dwolla payments',
        'Final migration push for stragglers',
        'Export Dwolla transaction history',
        'Deactivate Dwolla integration'
      ];
    };
  };

  featureFlags: {
    PAYMENT_PROVIDER: 'stripe' | 'dwolla' | 'both';
    ALLOW_DWOLLA_NEW_CUSTOMERS: boolean;
    SHOW_MIGRATION_BANNER: boolean;
  };
}
```

### 8.2 Backward Compatibility

```typescript
// Payment service adapter for backward compatibility

export class PaymentServiceAdapter {
  private dwolla?: DwollaService;
  private stripe?: StripeService;
  private plaid?: PlaidService;

  async createCustomer(params: CreateCustomerParams) {
    const provider = this.getProvider(params.companyId);

    if (provider === 'dwolla') {
      return this.dwolla.createCustomer(params);
    } else {
      // Create Stripe customer
      return this.stripe.createCustomer(params);
    }
  }

  private getProvider(companyId?: string): 'stripe' | 'dwolla' {
    // Check feature flag
    if (process.env.PAYMENT_PROVIDER === 'stripe') {
      return 'stripe';
    }

    // Check if existing customer with Dwolla
    if (companyId && this.hasD DwollaPayments(companyId)) {
      return 'dwolla';
    }

    // Default to Stripe for new customers
    return 'stripe';
  }
}
```

---

## 9. Error Handling & Monitoring

### 9.1 Comprehensive Error Codes

```typescript
export enum PaymentErrorCodes {
  // Plaid Errors (PL_*)
  PL_LINK_FAILED = 'PL_LINK_FAILED',
  PL_TOKEN_EXPIRED = 'PL_TOKEN_EXPIRED',
  PL_INVALID_ACCOUNT = 'PL_INVALID_ACCOUNT',
  PL_INSTITUTION_DOWN = 'PL_INSTITUTION_DOWN',

  // Stripe Errors (ST_*)
  ST_CUSTOMER_CREATION_FAILED = 'ST_CUSTOMER_CREATION_FAILED',
  ST_PAYMENT_METHOD_FAILED = 'ST_PAYMENT_METHOD_FAILED',
  ST_PAYMENT_DECLINED = 'ST_PAYMENT_DECLINED',
  ST_INSUFFICIENT_FUNDS = 'ST_INSUFFICIENT_FUNDS',

  // Integration Errors (INT_*)
  INT_PROCESSOR_TOKEN_FAILED = 'INT_PROCESSOR_TOKEN_FAILED',
  INT_WEBHOOK_VERIFICATION_FAILED = 'INT_WEBHOOK_VERIFICATION_FAILED',
  INT_DATABASE_ERROR = 'INT_DATABASE_ERROR',

  // Business Logic Errors (BL_*)
  BL_DUPLICATE_PAYMENT = 'BL_DUPLICATE_PAYMENT',
  BL_INVALID_PLAN = 'BL_INVALID_PLAN',
  BL_COMPANY_ALREADY_EXISTS = 'BL_COMPANY_ALREADY_EXISTS',
}

export const ErrorMessages: Record<PaymentErrorCodes, string> = {
  [PaymentErrorCodes.PL_LINK_FAILED]: 'Unable to connect to your bank. Please try again.',
  [PaymentErrorCodes.PL_TOKEN_EXPIRED]: 'Verification expired. Please restart the process.',
  [PaymentErrorCodes.ST_PAYMENT_DECLINED]: 'Payment was declined. Please check your account.',
  [PaymentErrorCodes.ST_INSUFFICIENT_FUNDS]: 'Insufficient funds in account.',
  // ... etc
};
```

### 9.2 Monitoring & Observability

```typescript
// src/utils/monitoring.ts

export class PaymentMonitoring {
  static logPaymentAttempt(params: {
    customerId: string;
    amount: number;
    provider: 'stripe' | 'plaid';
    step: string;
    success: boolean;
    error?: any;
  }) {
    const log = {
      timestamp: new Date().toISOString(),
      event: 'payment_attempt',
      ...params,
      environment: process.env.NODE_ENV,
    };

    // Send to logging service (DataDog, CloudWatch, etc)
    console.log(JSON.stringify(log));

    // Track metrics
    if (!params.success) {
      this.incrementErrorCounter(params.provider, params.step);
    }
  }

  static trackConversionFunnel(step: string, userId: string) {
    const events = {
      'signup_started': 1,
      'plaid_link_opened': 2,
      'bank_connected': 3,
      'payment_initiated': 4,
      'payment_completed': 5,
    };

    // Send to analytics (Mixpanel, Amplitude, etc)
    analytics.track({
      userId,
      event: step,
      properties: {
        funnel_step: events[step],
        timestamp: Date.now(),
      },
    });
  }
}
```

---

## 10. Testing Strategy

### 10.1 Test Environments

```typescript
interface TestConfiguration {
  plaid: {
    sandbox: {
      credentials: 'Use sandbox-xxx keys';
      testInstitutions: ['ins_109508', 'ins_109509']; // Chase, BoA
      testCredentials: {
        username: 'user_good';
        password: 'pass_good';
      };
    };
  };

  stripe: {
    testMode: {
      credentials: 'Use pk_test_xxx and sk_test_xxx';
      testCards: {
        success: '4000000000000077'; // ACH success
        failure: '4000000000000093'; // ACH failure
      };
      webhookTesting: 'Use Stripe CLI for local testing';
    };
  };
}
```

### 10.2 Integration Test Suite

```typescript
// tests/payment-flow.test.ts

describe('Payment Flow Integration', () => {
  test('Complete signup with payment flow', async () => {
    // 1. Create Plaid Link token
    const linkTokenResponse = await createLinkToken({
      userId: 'test-user',
      companyName: 'Test Company',
    });
    expect(linkTokenResponse.success).toBe(true);

    // 2. Simulate Plaid Link success (mock)
    const publicToken = 'public-sandbox-xxx';
    const accountId = 'account-sandbox-xxx';

    // 3. Process signup with payment
    const signupResponse = await signupWithPayment({
      email: 'test@example.com',
      companyName: 'Test Company',
      ownerName: 'John Doe',
      publicToken,
      accountId,
      planType: 'starter',
    });

    expect(signupResponse.success).toBe(true);
    expect(signupResponse.data.customerId).toBeDefined();

    // 4. Simulate webhook
    const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', {
      customer: signupResponse.data.customerId,
    });

    const webhookResponse = await handleWebhook(webhookEvent);
    expect(webhookResponse.processed).toBe(true);

    // 5. Verify company created
    const company = await getCompanyByStripeId(signupResponse.data.customerId);
    expect(company).toBeDefined();
  });
});
```

---

## 11. Production Readiness Checklist

### Pre-Launch Checklist

```markdown
## Infrastructure
- [ ] Stripe account verified and activated for ACH
- [ ] Plaid account provisioned with Production access
- [ ] Environment variables configured in Netlify
- [ ] Webhook endpoints configured in Stripe Dashboard
- [ ] Webhook secrets generated and stored
- [ ] SSL certificates valid for webhook endpoints

## Security
- [ ] API keys properly scoped (no admin keys in production)
- [ ] Webhook signature verification implemented
- [ ] Rate limiting configured on all endpoints
- [ ] Input validation with Zod schemas
- [ ] Error messages don't leak sensitive data
- [ ] Plaid access tokens encrypted in database
- [ ] PCI compliance review completed

## Testing
- [ ] Full payment flow tested in sandbox
- [ ] Webhook handling tested with Stripe CLI
- [ ] Error scenarios tested (insufficient funds, invalid account)
- [ ] Idempotency tested for duplicate requests
- [ ] Load testing completed for expected volume
- [ ] Monitoring alerts configured

## Documentation
- [ ] API documentation updated
- [ ] Runbook created for common issues
- [ ] Customer support trained on new flow
- [ ] Migration guide for existing customers

## Legal & Compliance
- [ ] ACH authorization language reviewed by legal
- [ ] Privacy policy updated for Plaid data sharing
- [ ] Terms of service updated for Stripe processing
- [ ] NACHA compliance verified
```

---

## 12. Common Issues & Solutions

### Troubleshooting Guide

```typescript
interface TroubleshootingGuide {
  issues: {
    'Plaid Link not opening': {
      causes: ['Link token expired', 'Invalid configuration', 'Browser blocking popup'];
      solutions: [
        'Regenerate Link token',
        'Check Plaid environment (sandbox/production)',
        'Ensure popup blockers disabled'
      ];
    };

    'Payment failing after bank connected': {
      causes: ['Processor token invalid', 'Stripe configuration', 'ACH not enabled'];
      solutions: [
        'Verify Plaid-Stripe integration active',
        'Check Stripe ACH capabilities enabled',
        'Ensure customer acceptance recorded'
      ];
    };

    'Webhook not received': {
      causes: ['URL misconfigured', 'Signature verification failing', 'Firewall blocking'];
      solutions: [
        'Verify webhook URL in Stripe dashboard',
        'Check webhook secret matches',
        'Whitelist Stripe IP addresses'
      ];
    };

    'ACH payment returned': {
      causes: ['Insufficient funds', 'Invalid account', 'Account closed'];
      solutions: [
        'Notify customer to update payment method',
        'Retry with exponential backoff',
        'Flag for manual review after 2 failures'
      ];
    };
  };
}
```

---

## Conclusion

This architecture provides a robust, secure, and scalable foundation for migrating from Dwolla to Stripe ACH with Plaid Link. The instant verification significantly improves user experience while maintaining security and compliance requirements.

### Key Benefits
1. **Instant Verification**: No more waiting 1-3 days for micro-deposits
2. **Better UX**: Modern, familiar Plaid Link interface
3. **Improved Security**: Bank-grade authentication via Plaid
4. **Better Error Handling**: Granular error codes and recovery flows
5. **Future-Proof**: Easy to add credit cards or other payment methods later

### Next Steps
1. Review and approve architecture
2. Set up Stripe and Plaid accounts
3. Implement PlaidService and StripeService classes
4. Update frontend with Plaid Link integration
5. Implement webhook handlers
6. Test in sandbox environment
7. Plan migration strategy for existing Dwolla customers
8. Launch with feature flag for gradual rollout

---

*Document Version: 1.0*
*Last Updated: January 2025*
*Author: Backend Architecture Team*