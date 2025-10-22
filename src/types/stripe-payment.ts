/**
 * STRIPE PAYMENT TYPE DEFINITIONS
 *
 * TypeScript interfaces for Stripe ACH payment processing.
 * Used across frontend and backend for type-safe payment operations.
 *
 * Security Notes:
 * - Never expose sensitive payment data in logs
 * - Always validate amounts are positive and within limits
 * - Verify webhook signatures before processing
 *
 * @see STRIPE-PLAID-ARCHITECTURE.md
 * @see SECURITY-AUDIT-STRIPE-PLAID.md
 */

import type Stripe from 'stripe';

// ==============================================================================
// ENUMS & CONSTANTS
// ==============================================================================

/**
 * Payment status lifecycle for ACH transactions
 *
 * ACH payments take 3-5 business days to process
 */
export type StripePaymentStatus =
  | 'pending'        // Payment initiated, awaiting processing
  | 'processing'     // Payment in progress (ACH clearing)
  | 'succeeded'      // Payment successfully completed
  | 'failed'         // Payment failed (insufficient funds, invalid account)
  | 'canceled'       // Payment canceled by user or system
  | 'requires_action'; // Additional action required (e.g., mandate confirmation)

/**
 * Subscription status for recurring billing
 */
export type StripeSubscriptionStatus =
  | 'active'         // Subscription active and billing normally
  | 'past_due'       // Payment failed, retry in progress
  | 'unpaid'         // Payment failed after retries
  | 'canceled'       // Subscription canceled by user
  | 'incomplete'     // Initial payment pending
  | 'incomplete_expired' // Initial payment failed
  | 'trialing'       // In trial period
  | 'paused';        // Subscription paused

/**
 * Payment intent confirmation method
 */
export type StripeConfirmationMethod = 'automatic' | 'manual';

/**
 * Payment method types supported
 */
export type StripePaymentMethodType = 'us_bank_account' | 'card';

/**
 * Account holder type for ACH payments
 */
export type StripeAccountHolderType = 'company' | 'individual';

/**
 * ACH account types
 */
export type StripeAchAccountType = 'checking' | 'savings';

// ==============================================================================
// CUSTOMER TYPES
// ==============================================================================

/**
 * Parameters for creating a Stripe customer
 *
 * @example
 * ```typescript
 * const params: CreateStripeCustomerParams = {
 *   email: 'owner@landscaping.com',
 *   companyName: 'Green Lawn Landscaping',
 *   ownerName: 'John Smith',
 *   companyId: 'uuid-here',
 *   metadata: {
 *     signup_source: 'website',
 *     plan_type: 'growth'
 *   }
 * };
 * ```
 */
export interface CreateStripeCustomerParams {
  /** Company email address (used for billing) */
  email: string;

  /** Legal company name */
  companyName: string;

  /** Business owner full name */
  ownerName: string;

  /** Internal company UUID (optional, set after creation) */
  companyId?: string;

  /** Phone number for customer support */
  phone?: string;

  /** Additional metadata for tracking and analytics */
  metadata?: Record<string, string>;

  /** Company billing address */
  address?: StripeAddress;
}

/**
 * Stripe customer object (simplified from Stripe.Customer)
 */
export interface StripeCustomer {
  /** Stripe customer ID (cus_xxx) */
  id: string;

  /** Customer email */
  email: string;

  /** Customer name */
  name: string;

  /** Phone number */
  phone?: string;

  /** Customer description */
  description?: string;

  /** Default payment method */
  invoice_settings?: {
    default_payment_method?: string;
  };

  /** Customer metadata */
  metadata: Record<string, string>;

  /** Customer address */
  address?: StripeAddress;

  /** Account balance (in cents) */
  balance: number;

  /** Timestamp when created */
  created: number;

  /** Whether customer is deleted */
  deleted?: boolean;
}

/**
 * Response from customer creation
 */
export interface CreateStripeCustomerResponse {
  /** Stripe customer ID */
  customerId: string;

  /** Full customer object */
  customer: StripeCustomer;
}

// ==============================================================================
// PAYMENT METHOD TYPES
// ==============================================================================

/**
 * Parameters for creating ACH payment method from Plaid
 *
 * @example
 * ```typescript
 * const params: CreateStripePaymentMethodParams = {
 *   customerId: 'cus_xxx',
 *   processorToken: 'btok_xxx',
 *   accountHolderType: 'company',
 *   setAsDefault: true
 * };
 * ```
 */
export interface CreateStripePaymentMethodParams {
  /** Stripe customer ID */
  customerId: string;

  /** Plaid processor token (bank account token from Stripe processor) */
  processorToken: string;

  /** Account holder type */
  accountHolderType?: StripeAccountHolderType;

  /** Whether to set as default payment method */
  setAsDefault?: boolean;
}

/**
 * ACH bank account details (masked for security)
 */
export interface StripeUSBankAccount {
  /** Bank account ID */
  id: string;

  /** Account type (checking/savings) */
  account_type: StripeAchAccountType;

  /** Account holder type */
  account_holder_type: StripeAccountHolderType;

  /** Bank name */
  bank_name: string;

  /** Fingerprint for duplicate detection */
  fingerprint: string;

  /** Last 4 digits of account number */
  last4: string;

  /** Routing number (full) */
  routing_number: string;

  /** Account status */
  status: 'verified' | 'verification_failed' | 'errored';
}

/**
 * Stripe payment method object
 */
export interface StripePaymentMethod {
  /** Payment method ID (pm_xxx) */
  id: string;

  /** Payment method type */
  type: StripePaymentMethodType;

  /** ACH bank account details */
  us_bank_account?: StripeUSBankAccount;

  /** Card details (if type is 'card') */
  card?: Stripe.PaymentMethod.Card;

  /** Billing details */
  billing_details: {
    email?: string;
    name?: string;
    phone?: string;
    address?: StripeAddress;
  };

  /** Customer this payment method belongs to */
  customer?: string;

  /** Timestamp when created */
  created: number;

  /** Metadata */
  metadata: Record<string, string>;
}

/**
 * Response from payment method creation
 */
export interface CreateStripePaymentMethodResponse {
  /** Payment method ID */
  paymentMethodId: string;

  /** Full payment method object */
  paymentMethod: StripePaymentMethod;
}

// ==============================================================================
// PAYMENT INTENT TYPES (ACH PAYMENTS)
// ==============================================================================

/**
 * Parameters for creating a payment intent (one-time payment)
 *
 * @example
 * ```typescript
 * const params: CreateStripePaymentParams = {
 *   customerId: 'cus_xxx',
 *   paymentMethodId: 'pm_xxx',
 *   amount: 299.00,
 *   companyId: 'uuid-here',
 *   companyName: 'Green Lawn Landscaping',
 *   description: 'Monthly subscription - January 2025',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...',
 *   metadata: {
 *     invoice_id: 'inv_xxx',
 *     billing_period: '2025-01'
 *   }
 * };
 * ```
 */
export interface CreateStripePaymentParams {
  /** Stripe customer ID */
  customerId: string;

  /** Stripe payment method ID */
  paymentMethodId: string;

  /** Payment amount in dollars (will be converted to cents) */
  amount: number;

  /** Internal company UUID */
  companyId: string;

  /** Company name for description */
  companyName: string;

  /** Payment description */
  description?: string;

  /** Customer IP address (required for mandate acceptance) */
  ipAddress?: string;

  /** Customer user agent (required for mandate acceptance) */
  userAgent?: string;

  /** Invoice ID (for tracking) */
  invoiceId?: string;

  /** Billing period (e.g., '2025-01') */
  billingPeriod?: string;

  /** Additional metadata */
  metadata?: Record<string, string>;

  /** Whether to save payment method for future use */
  setupFutureUsage?: boolean;
}

/**
 * Mandate data for ACH authorization
 */
export interface StripeMandateData {
  customer_acceptance: {
    type: 'online' | 'offline';
    online?: {
      ip_address: string;
      user_agent: string;
    };
    offline?: Record<string, never>;
  };
}

/**
 * Stripe payment intent object
 */
export interface StripePaymentIntent {
  /** Payment intent ID (pi_xxx) */
  id: string;

  /** Amount in cents */
  amount: number;

  /** Currency (USD) */
  currency: string;

  /** Payment status */
  status: StripePaymentStatus;

  /** Customer ID */
  customer: string;

  /** Payment method ID */
  payment_method?: string;

  /** Client secret for frontend confirmation */
  client_secret: string;

  /** Confirmation method */
  confirmation_method: StripeConfirmationMethod;

  /** Payment description */
  description?: string;

  /** Metadata */
  metadata: Record<string, string>;

  /** Mandate data */
  mandate_data?: StripeMandateData;

  /** Latest charge ID */
  latest_charge?: string;

  /** Timestamp when created */
  created: number;

  /** Next action required */
  next_action?: {
    type: string;
    [key: string]: unknown;
  };

  /** Last payment error */
  last_payment_error?: StripeError;
}

/**
 * Response from payment intent creation
 */
export interface CreateStripePaymentResponse {
  /** Payment intent ID */
  paymentIntentId: string;

  /** Payment status */
  status: StripePaymentStatus;

  /** Client secret (optional, for frontend confirmation) */
  clientSecret?: string;

  /** Full payment intent object */
  paymentIntent?: StripePaymentIntent;
}

// ==============================================================================
// SUBSCRIPTION TYPES
// ==============================================================================

/**
 * Subscription plan intervals
 */
export type StripeBillingInterval = 'month' | 'year';

/**
 * Tradesphere subscription plan types
 */
export type TradespherePlanType = 'starter' | 'growth' | 'enterprise';

/**
 * Parameters for creating a subscription
 *
 * @example
 * ```typescript
 * const params: CreateStripeSubscriptionParams = {
 *   customerId: 'cus_xxx',
 *   amount: 299.00,
 *   interval: 'month',
 *   companyId: 'uuid-here',
 *   planType: 'growth',
 *   trialDays: 0,
 *   billingAnchor: 1
 * };
 * ```
 */
export interface CreateStripeSubscriptionParams {
  /** Stripe customer ID */
  customerId: string;

  /** Subscription amount in dollars */
  amount: number;

  /** Billing interval */
  interval: StripeBillingInterval;

  /** Internal company UUID */
  companyId: string;

  /** Tradesphere plan type */
  planType: TradespherePlanType;

  /** Trial period in days (0 for no trial) */
  trialDays?: number;

  /** Day of month to bill (1-31) */
  billingAnchor?: number;

  /** Additional metadata */
  metadata?: Record<string, string>;
}

/**
 * Stripe subscription object
 */
export interface StripeSubscription {
  /** Subscription ID (sub_xxx) */
  id: string;

  /** Customer ID */
  customer: string;

  /** Subscription status */
  status: StripeSubscriptionStatus;

  /** Subscription items (plans) */
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        unit_amount: number;
        currency: string;
        recurring: {
          interval: StripeBillingInterval;
        };
      };
    }>;
  };

  /** Default payment method */
  default_payment_method?: string;

  /** Latest invoice */
  latest_invoice?: string;

  /** Current period start */
  current_period_start: number;

  /** Current period end */
  current_period_end: number;

  /** Trial start (if applicable) */
  trial_start?: number;

  /** Trial end (if applicable) */
  trial_end?: number;

  /** Timestamp when canceled (if applicable) */
  canceled_at?: number;

  /** Cancel at period end flag */
  cancel_at_period_end: boolean;

  /** Metadata */
  metadata: Record<string, string>;

  /** Timestamp when created */
  created: number;
}

/**
 * Response from subscription creation
 */
export interface CreateStripeSubscriptionResponse {
  /** Subscription ID */
  subscriptionId: string;

  /** Full subscription object */
  subscription: StripeSubscription;

  /** First payment intent (if created) */
  paymentIntent?: StripePaymentIntent;
}

// ==============================================================================
// WEBHOOK TYPES
// ==============================================================================

/**
 * Stripe webhook event types we handle
 */
export type StripeWebhookEventType =
  // Payment Intent Events
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.processing'
  | 'payment_intent.requires_action'
  | 'payment_intent.canceled'

  // Charge Events (ACH specific)
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.pending'
  | 'charge.refunded'

  // Subscription Events
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'

  // Payment Method Events
  | 'payment_method.attached'
  | 'payment_method.detached'
  | 'payment_method.updated'

  // Customer Events
  | 'customer.updated'
  | 'customer.deleted';

/**
 * Stripe webhook event structure
 *
 * @example
 * ```typescript
 * const event: StripeWebhookEvent = {
 *   id: 'evt_xxx',
 *   type: 'payment_intent.succeeded',
 *   data: {
 *     object: paymentIntent
 *   },
 *   created: 1234567890,
 *   livemode: false,
 *   api_version: '2024-11-20.acacia'
 * };
 * ```
 */
export interface StripeWebhookEvent<T = unknown> {
  /** Event ID */
  id: string;

  /** Event type */
  type: StripeWebhookEventType;

  /** Event data */
  data: {
    /** The object (PaymentIntent, Subscription, etc.) */
    object: T;

    /** Previous attributes (for update events) */
    previous_attributes?: Partial<T>;
  };

  /** Request information */
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };

  /** Timestamp when event created */
  created: number;

  /** Whether this is a live event */
  livemode: boolean;

  /** Stripe API version */
  api_version: string;
}

/**
 * Webhook signature verification result
 */
export interface WebhookVerificationResult {
  /** Whether signature is valid */
  valid: boolean;

  /** Verified event (if valid) */
  event?: StripeWebhookEvent;

  /** Error message (if invalid) */
  error?: string;
}

/**
 * Webhook processing response
 */
export interface WebhookProcessingResponse {
  /** Whether webhook was received */
  received: boolean;

  /** Whether webhook was processed successfully */
  processed: boolean;

  /** Event ID */
  eventId?: string;

  /** Error message (if failed) */
  error?: string;
}

// ==============================================================================
// ERROR TYPES
// ==============================================================================

/**
 * Stripe error types
 */
export type StripeErrorType =
  | 'api_error'
  | 'api_connection_error'
  | 'authentication_error'
  | 'card_error'
  | 'idempotency_error'
  | 'invalid_request_error'
  | 'rate_limit_error';

/**
 * Stripe error codes (common ones)
 */
export type StripeErrorCode =
  // ACH specific
  | 'account_closed'
  | 'account_frozen'
  | 'insufficient_funds'
  | 'invalid_account_number'
  | 'invalid_routing_number'
  | 'bank_account_declined'
  | 'bank_account_restricted'
  | 'bank_account_unusable'
  | 'debit_not_authorized'

  // Payment errors
  | 'payment_intent_authentication_failure'
  | 'payment_intent_payment_attempt_failed'
  | 'payment_method_invalid'

  // Customer errors
  | 'customer_not_found'
  | 'duplicate_customer'

  // General errors
  | 'api_key_expired'
  | 'rate_limit'
  | 'processing_error';

/**
 * Stripe error object
 */
export interface StripeError {
  /** Error type */
  type: StripeErrorType;

  /** Error code */
  code?: StripeErrorCode;

  /** Error message */
  message: string;

  /** Parameter that caused the error */
  param?: string;

  /** Decline code (for card errors) */
  decline_code?: string;

  /** Charge ID (if applicable) */
  charge?: string;

  /** Payment intent ID (if applicable) */
  payment_intent?: StripePaymentIntent;

  /** Payment method ID (if applicable) */
  payment_method?: StripePaymentMethod;
}

/**
 * Service error response
 */
export interface StripeServiceError {
  /** Error code for programmatic handling */
  code: string;

  /** Detailed error message (for logging) */
  message: string;

  /** User-friendly error message (safe to display) */
  userMessage: string;

  /** Additional error details */
  details?: unknown;

  /** Whether error is retryable */
  retryable?: boolean;
}

// ==============================================================================
// UTILITY TYPES
// ==============================================================================

/**
 * Address information
 */
export interface StripeAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

/**
 * Service response wrapper
 * Generic type for all service method responses
 *
 * @example
 * ```typescript
 * const result: StripeServiceResponse<CreateStripeCustomerResponse> =
 *   await stripeService.createCustomer(params);
 *
 * if (result.success) {
 *   console.log(result.data.customerId);
 * } else {
 *   console.error(result.error?.userMessage);
 * }
 * ```
 */
export interface StripeServiceResponse<T = unknown> {
  /** Whether operation succeeded */
  success: boolean;

  /** Response data (if successful) */
  data?: T;

  /** Error information (if failed) */
  error?: StripeServiceError;
}

/**
 * Idempotency key for preventing duplicate operations
 */
export interface IdempotencyKey {
  /** Unique key */
  key: string;

  /** Operation that was performed */
  operation: string;

  /** Result of the operation */
  result?: unknown;

  /** Timestamp when created */
  created_at: string;

  /** Timestamp when key expires */
  expires_at: string;
}

/**
 * ACH mandate acceptance record
 * Required for NACHA compliance
 */
export interface ACHMandateAcceptance {
  /** Customer ID */
  customer_id: string;

  /** Full authorization text shown to customer */
  authorization_text: string;

  /** Customer IP address at time of acceptance */
  ip_address: string;

  /** Customer user agent at time of acceptance */
  user_agent: string;

  /** Timestamp of acceptance */
  timestamp: string;

  /** Signature method (electronic_consent) */
  signature_method: 'electronic_consent' | 'written';

  /** Amount authorized */
  amount?: number;

  /** Frequency (one_time, recurring) */
  frequency?: 'one_time' | 'recurring';

  /** Last 4 of account */
  account_last4?: string;
}

// ==============================================================================
// TYPE GUARDS
// ==============================================================================

/**
 * Type guard to check if a payment status is successful
 *
 * @example
 * ```typescript
 * if (isSuccessfulPaymentStatus(payment.status)) {
 *   // Payment completed successfully
 * }
 * ```
 */
export function isSuccessfulPaymentStatus(
  status: StripePaymentStatus
): status is 'succeeded' {
  return status === 'succeeded';
}

/**
 * Type guard to check if a payment status is final (terminal state)
 */
export function isFinalPaymentStatus(
  status: StripePaymentStatus
): status is 'succeeded' | 'failed' | 'canceled' {
  return ['succeeded', 'failed', 'canceled'].includes(status);
}

/**
 * Type guard to check if a subscription is active
 */
export function isActiveSubscription(
  status: StripeSubscriptionStatus
): status is 'active' | 'trialing' {
  return ['active', 'trialing'].includes(status);
}

/**
 * Type guard to check if an error is retryable
 */
export function isRetryableStripeError(error: StripeError): boolean {
  const retryableCodes: StripeErrorCode[] = [
    'processing_error',
    'rate_limit'
  ];

  const retryableTypes: StripeErrorType[] = [
    'api_connection_error',
    'rate_limit_error'
  ];

  return (
    (error.code && retryableCodes.includes(error.code)) ||
    retryableTypes.includes(error.type)
  );
}

/**
 * Type guard to check if payment method is ACH
 */
export function isACHPaymentMethod(
  paymentMethod: StripePaymentMethod
): paymentMethod is StripePaymentMethod & { us_bank_account: StripeUSBankAccount } {
  return paymentMethod.type === 'us_bank_account' && !!paymentMethod.us_bank_account;
}

// ==============================================================================
// VALIDATION HELPERS
// ==============================================================================

/**
 * Validate payment amount
 *
 * @throws Error if amount is invalid
 */
export function validatePaymentAmount(amount: number): void {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  if (amount > 1000000) {
    throw new Error('Payment amount exceeds maximum ($1,000,000)');
  }

  if (!Number.isFinite(amount)) {
    throw new Error('Payment amount must be a valid number');
  }
}

/**
 * Convert dollars to cents for Stripe API
 *
 * @example
 * ```typescript
 * const cents = dollarsToCents(299.99); // 29999
 * ```
 */
export function dollarsToCents(dollars: number): number {
  validatePaymentAmount(dollars);
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars for display
 *
 * @example
 * ```typescript
 * const dollars = centsToDollars(29999); // 299.99
 * ```
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format amount for display
 *
 * @example
 * ```typescript
 * const formatted = formatAmount(299.99); // "$299.99"
 * ```
 */
export function formatAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
