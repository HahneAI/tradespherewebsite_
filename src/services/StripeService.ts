/**
 * STRIPE ACH PAYMENT SERVICE
 *
 * Production-ready service for Stripe API integration.
 * Handles customer management, ACH payment processing via Plaid, and subscription billing.
 *
 * IMPORTANT SECURITY NOTES:
 * - This service can ONLY be used server-side (Netlify functions)
 * - Never expose Stripe secret keys to the frontend
 * - Always validate webhook signatures before processing
 * - Use idempotency keys for payment operations
 * - Sanitize all error messages before displaying to users
 *
 * @see STRIPE-PLAID-ARCHITECTURE.md
 * @see SECURITY-IMPLEMENTATION-GUIDE.md
 */

import Stripe from 'stripe';
import crypto from 'crypto';
import type {
  CreateStripeCustomerParams,
  CreateStripeCustomerResponse,
  CreateStripePaymentMethodParams,
  CreateStripePaymentMethodResponse,
  CreateStripePaymentParams,
  CreateStripePaymentResponse,
  CreateStripeSubscriptionParams,
  CreateStripeSubscriptionResponse,
  StripeCustomer,
  StripePaymentMethod,
  StripePaymentIntent,
  StripeSubscription,
  StripePaymentStatus,
  StripeSubscriptionStatus,
  StripeServiceResponse,
  StripeServiceError,
  StripeWebhookEvent,
  WebhookVerificationResult,
  StripeMandateData,
  dollarsToCents,
  centsToDollars,
  validatePaymentAmount,
  isRetryableStripeError,
  StripeError,
  StripeErrorType,
  StripeErrorCode,
} from '../types/stripe-payment';

/**
 * Stripe service singleton for ACH payment processing
 *
 * @example
 * ```typescript
 * const stripe = StripeService.getInstance();
 *
 * // Create customer
 * const { data: customer } = await stripe.createCustomer({
 *   email: 'owner@company.com',
 *   companyName: 'ABC Landscaping',
 *   ownerName: 'John Doe'
 * });
 *
 * // Attach payment method from Plaid
 * const { data: paymentMethod } = await stripe.createPaymentMethodFromPlaid({
 *   customerId: customer.customerId,
 *   processorToken: 'btok_xxx',
 *   accountHolderType: 'company'
 * });
 *
 * // Process payment
 * const { data: payment } = await stripe.createPaymentIntent({
 *   customerId: customer.customerId,
 *   paymentMethodId: paymentMethod.paymentMethodId,
 *   amount: 299.00,
 *   companyId: 'uuid',
 *   companyName: 'ABC Landscaping',
 *   description: 'Monthly subscription'
 * });
 * ```
 */
export class StripeService {
  private stripe: Stripe;
  private static instance: StripeService;

  /**
   * Private constructor for singleton pattern
   *
   * SECURITY: Stripe credentials must ONLY be available server-side.
   * This service should only be used in Netlify functions, never in browser code.
   */
  private constructor() {
    // Validate environment
    if (typeof window !== 'undefined') {
      throw new Error(
        'StripeService cannot be used in browser environment. ' +
        'This service contains secret keys and must only be used server-side.'
      );
    }

    // Validate environment variables (server-side only)
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      throw new Error(
        'Stripe secret key not configured. Set STRIPE_SECRET_KEY environment variable. ' +
        'This service can only be used server-side (Netlify functions), never in browser code.'
      );
    }

    if (!webhookSecret) {
      console.warn(
        'STRIPE_WEBHOOK_SECRET not configured. Webhook signature verification will fail.'
      );
    }

    // Initialize Stripe with production-ready configuration
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
      maxNetworkRetries: 3, // Automatic retry for network failures
      timeout: 30000, // 30 second timeout
      telemetry: false, // Disable telemetry for privacy
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // ============================================================================
  // CUSTOMER MANAGEMENT
  // ============================================================================

  /**
   * Create a Stripe customer for a new company
   *
   * @param params Customer creation parameters
   * @returns Customer ID and full customer object
   *
   * @example
   * ```typescript
   * const { data } = await stripe.createCustomer({
   *   email: 'owner@company.com',
   *   companyName: 'ABC Landscaping LLC',
   *   ownerName: 'John Doe',
   *   companyId: 'uuid-here',
   *   metadata: {
   *     signup_source: 'website',
   *     plan_type: 'growth'
   *   }
   * });
   * console.log(data.customerId); // cus_xxx
   * ```
   */
  async createCustomer(params: CreateStripeCustomerParams): Promise<StripeServiceResponse<CreateStripeCustomerResponse>> {
    try {
      // Input validation
      if (!params.email || !params.email.includes('@')) {
        return {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email address provided',
            userMessage: 'Please provide a valid email address.',
          },
        };
      }

      if (!params.companyName || params.companyName.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_COMPANY_NAME',
            message: 'Company name is required',
            userMessage: 'Please provide your company name.',
          },
        };
      }

      // Create customer with ACH-specific settings
      const customer = await this.stripe.customers.create({
        email: params.email.toLowerCase(),
        name: params.companyName,
        description: `Business owner: ${params.ownerName}`,
        phone: params.phone,
        address: params.address,
        metadata: {
          company_id: params.companyId || '',
          owner_name: params.ownerName,
          signup_date: new Date().toISOString(),
          ...params.metadata,
        },
        // ACH-specific settings
        invoice_settings: {
          custom_fields: null,
          default_payment_method: null, // Will be set after payment method attached
          footer: null,
        },
        // Prevent card payments (ACH only)
        preferred_locales: ['en'],
      });

      // Map to our response type
      const response: CreateStripeCustomerResponse = {
        customerId: customer.id,
        customer: this.mapStripeCustomer(customer),
      };

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to create customer');
    }
  }

  /**
   * Get customer details
   *
   * @param customerId Stripe customer ID
   * @returns Customer details
   *
   * @example
   * ```typescript
   * const { data } = await stripe.getCustomer('cus_xxx');
   * console.log(data.email, data.metadata);
   * ```
   */
  async getCustomer(customerId: string): Promise<StripeServiceResponse<StripeCustomer>> {
    try {
      if (!customerId || !customerId.startsWith('cus_')) {
        return {
          success: false,
          error: {
            code: 'INVALID_CUSTOMER_ID',
            message: `Invalid customer ID format: ${customerId}`,
            userMessage: 'Invalid customer identifier.',
          },
        };
      }

      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        return {
          success: false,
          error: {
            code: 'CUSTOMER_DELETED',
            message: `Customer ${customerId} has been deleted`,
            userMessage: 'Customer account not found.',
          },
        };
      }

      return {
        success: true,
        data: this.mapStripeCustomer(customer as Stripe.Customer),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to retrieve customer');
    }
  }

  /**
   * Update customer information
   *
   * @param customerId Stripe customer ID
   * @param updates Customer updates
   * @returns Updated customer
   *
   * @example
   * ```typescript
   * const { data } = await stripe.updateCustomer('cus_xxx', {
   *   email: 'newemail@company.com',
   *   metadata: { plan_upgraded: 'true' }
   * });
   * ```
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<CreateStripeCustomerParams>
  ): Promise<StripeServiceResponse<StripeCustomer>> {
    try {
      if (!customerId || !customerId.startsWith('cus_')) {
        return {
          success: false,
          error: {
            code: 'INVALID_CUSTOMER_ID',
            message: `Invalid customer ID format: ${customerId}`,
            userMessage: 'Invalid customer identifier.',
          },
        };
      }

      const updateParams: Stripe.CustomerUpdateParams = {};

      if (updates.email) {
        updateParams.email = updates.email.toLowerCase();
      }

      if (updates.companyName) {
        updateParams.name = updates.companyName;
      }

      if (updates.ownerName) {
        updateParams.description = `Business owner: ${updates.ownerName}`;
      }

      if (updates.phone) {
        updateParams.phone = updates.phone;
      }

      if (updates.address) {
        updateParams.address = updates.address;
      }

      if (updates.metadata) {
        updateParams.metadata = updates.metadata;
      }

      const customer = await this.stripe.customers.update(customerId, updateParams);

      return {
        success: true,
        data: this.mapStripeCustomer(customer),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to update customer');
    }
  }

  // ============================================================================
  // PAYMENT METHOD MANAGEMENT
  // ============================================================================

  /**
   * Create ACH payment method from Plaid processor token
   *
   * @param params Payment method creation parameters
   * @returns Payment method ID and details
   *
   * @example
   * ```typescript
   * const { data } = await stripe.createPaymentMethodFromPlaid({
   *   customerId: 'cus_xxx',
   *   processorToken: 'btok_xxx', // From Plaid
   *   accountHolderType: 'company',
   *   setAsDefault: true
   * });
   * console.log(data.paymentMethodId); // pm_xxx
   * ```
   */
  async createPaymentMethodFromPlaid(
    params: CreateStripePaymentMethodParams
  ): Promise<StripeServiceResponse<CreateStripePaymentMethodResponse>> {
    try {
      // Validate inputs
      if (!params.customerId || !params.customerId.startsWith('cus_')) {
        return {
          success: false,
          error: {
            code: 'INVALID_CUSTOMER_ID',
            message: `Invalid customer ID format: ${params.customerId}`,
            userMessage: 'Invalid customer identifier.',
          },
        };
      }

      if (!params.processorToken || !params.processorToken.startsWith('btok_')) {
        return {
          success: false,
          error: {
            code: 'INVALID_PROCESSOR_TOKEN',
            message: `Invalid processor token format: ${params.processorToken}`,
            userMessage: 'Invalid bank account token. Please reconnect your bank account.',
          },
        };
      }

      // Get customer for billing details
      const customerResult = await this.getCustomer(params.customerId);
      if (!customerResult.success || !customerResult.data) {
        return {
          success: false,
          error: customerResult.error || {
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer not found',
            userMessage: 'Customer account not found.',
          },
        };
      }

      const customer = customerResult.data;

      // Create payment method from Plaid bank account token
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'us_bank_account',
        us_bank_account: {
          account_holder_type: params.accountHolderType || 'company',
          // Use the Plaid processor token directly
          bank_account: params.processorToken,
        },
        billing_details: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        },
      });

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: params.customerId,
      });

      // Set as default if requested
      if (params.setAsDefault) {
        await this.stripe.customers.update(params.customerId, {
          invoice_settings: {
            default_payment_method: paymentMethod.id,
          },
        });
      }

      const response: CreateStripePaymentMethodResponse = {
        paymentMethodId: paymentMethod.id,
        paymentMethod: this.mapStripePaymentMethod(paymentMethod),
      };

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to create payment method');
    }
  }

  /**
   * Attach an existing payment method to a customer
   *
   * @param paymentMethodId Payment method ID
   * @param customerId Customer ID
   * @returns Attached payment method
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<StripeServiceResponse<StripePaymentMethod>> {
    try {
      if (!paymentMethodId || !paymentMethodId.startsWith('pm_')) {
        return {
          success: false,
          error: {
            code: 'INVALID_PAYMENT_METHOD',
            message: `Invalid payment method ID: ${paymentMethodId}`,
            userMessage: 'Invalid payment method.',
          },
        };
      }

      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return {
        success: true,
        data: this.mapStripePaymentMethod(paymentMethod),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to attach payment method');
    }
  }

  /**
   * Set default payment method for a customer
   *
   * @param customerId Customer ID
   * @param paymentMethodId Payment method ID
   * @returns Updated customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<StripeServiceResponse<StripeCustomer>> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return {
        success: true,
        data: this.mapStripeCustomer(customer),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to set default payment method');
    }
  }

  /**
   * Get all payment methods for a customer
   *
   * @param customerId Customer ID
   * @param type Payment method type filter (optional)
   * @returns List of payment methods
   *
   * @example
   * ```typescript
   * const { data } = await stripe.getPaymentMethods('cus_xxx', 'us_bank_account');
   * data.forEach(pm => {
   *   console.log(pm.us_bank_account?.last4, pm.us_bank_account?.bank_name);
   * });
   * ```
   */
  async getPaymentMethods(
    customerId: string,
    type?: 'us_bank_account' | 'card'
  ): Promise<StripeServiceResponse<StripePaymentMethod[]>> {
    try {
      const params: Stripe.PaymentMethodListParams = {
        customer: customerId,
        limit: 100,
      };

      if (type) {
        params.type = type;
      }

      const paymentMethods = await this.stripe.paymentMethods.list(params);

      return {
        success: true,
        data: paymentMethods.data.map(pm => this.mapStripePaymentMethod(pm)),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to retrieve payment methods');
    }
  }

  // ============================================================================
  // PAYMENT PROCESSING
  // ============================================================================

  /**
   * Create a payment intent for one-time ACH payment
   *
   * @param params Payment parameters
   * @returns Payment intent with client secret
   *
   * @example
   * ```typescript
   * const { data } = await stripe.createPaymentIntent({
   *   customerId: 'cus_xxx',
   *   paymentMethodId: 'pm_xxx',
   *   amount: 299.00, // $299
   *   companyId: 'uuid',
   *   companyName: 'ABC Landscaping',
   *   description: 'Monthly subscription - January 2025',
   *   ipAddress: '192.168.1.1',
   *   userAgent: 'Mozilla/5.0...'
   * });
   * console.log(data.paymentIntentId); // pi_xxx
   * console.log(data.status); // 'processing' for ACH
   * ```
   */
  async createPaymentIntent(
    params: CreateStripePaymentParams
  ): Promise<StripeServiceResponse<CreateStripePaymentResponse>> {
    try {
      // Validate amount
      try {
        validatePaymentAmount(params.amount);
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: error.message,
            userMessage: error.message,
          },
        };
      }

      // Generate idempotency key for this payment
      const idempotencyKey = this.generateIdempotencyKey(
        params.customerId,
        params.amount,
        params.invoiceId || ''
      );

      // Create mandate data for ACH authorization
      const mandateData: StripeMandateData = {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: params.ipAddress || '0.0.0.0',
            user_agent: params.userAgent || 'Unknown',
          },
        },
      };

      // Create payment intent with ACH-specific configuration
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: dollarsToCents(params.amount),
          currency: 'usd',
          customer: params.customerId,
          payment_method: params.paymentMethodId,
          payment_method_types: ['us_bank_account'],
          confirm: true, // Auto-confirm for ACH
          description: params.description || `Payment from ${params.companyName}`,
          metadata: {
            company_id: params.companyId,
            company_name: params.companyName,
            invoice_id: params.invoiceId || '',
            billing_period: params.billingPeriod || '',
            ...params.metadata,
          },
          mandate_data: mandateData,
          setup_future_usage: params.setupFutureUsage ? 'on_session' : undefined,
          // ACH-specific: Set confirmation method
          confirmation_method: 'automatic',
          // Important for ACH: This will create the payment and put it in 'processing' status
          // The webhook will fire when it completes (3-5 business days)
        },
        {
          idempotencyKey,
        }
      );

      const response: CreateStripePaymentResponse = {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status as StripePaymentStatus,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntent: this.mapStripePaymentIntent(paymentIntent),
      };

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to create payment');
    }
  }

  /**
   * Confirm a payment intent (if manual confirmation)
   *
   * @param paymentIntentId Payment intent ID
   * @param paymentMethodId Payment method ID (optional)
   * @returns Confirmed payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<StripeServiceResponse<StripePaymentIntent>> {
    try {
      const params: Stripe.PaymentIntentConfirmParams = {};

      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        params
      );

      return {
        success: true,
        data: this.mapStripePaymentIntent(paymentIntent),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to confirm payment');
    }
  }

  /**
   * Cancel a payment intent
   *
   * @param paymentIntentId Payment intent ID
   * @param reason Cancellation reason
   * @returns Canceled payment intent
   */
  async cancelPaymentIntent(
    paymentIntentId: string,
    reason?: string
  ): Promise<StripeServiceResponse<StripePaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId, {
        cancellation_reason: reason as Stripe.PaymentIntentCancelParams.CancellationReason,
      });

      return {
        success: true,
        data: this.mapStripePaymentIntent(paymentIntent),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to cancel payment');
    }
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * Create a subscription for recurring ACH payments
   *
   * @param params Subscription parameters
   * @returns Subscription and initial payment intent
   *
   * @example
   * ```typescript
   * const { data } = await stripe.createSubscription({
   *   customerId: 'cus_xxx',
   *   amount: 299.00,
   *   interval: 'month',
   *   companyId: 'uuid',
   *   planType: 'growth',
   *   billingAnchor: 1 // Bill on 1st of month
   * });
   * console.log(data.subscriptionId); // sub_xxx
   * ```
   */
  async createSubscription(
    params: CreateStripeSubscriptionParams
  ): Promise<StripeServiceResponse<CreateStripeSubscriptionResponse>> {
    try {
      // Validate amount
      try {
        validatePaymentAmount(params.amount);
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: error.message,
            userMessage: error.message,
          },
        };
      }

      // Create or get price for the subscription
      const priceId = await this.getOrCreatePrice(
        params.amount,
        params.interval,
        params.planType
      );

      if (!priceId) {
        return {
          success: false,
          error: {
            code: 'PRICE_CREATION_FAILED',
            message: 'Failed to create subscription price',
            userMessage: 'Unable to set up subscription pricing.',
          },
        };
      }

      // Create subscription
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['us_bank_account'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          company_id: params.companyId,
          plan_type: params.planType,
          ...params.metadata,
        },
        // Billing configuration
        collection_method: 'charge_automatically',
        billing_cycle_anchor: params.billingAnchor
          ? this.calculateBillingAnchor(params.billingAnchor)
          : undefined,
        trial_period_days: params.trialDays,
      };

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      const response: CreateStripeSubscriptionResponse = {
        subscriptionId: subscription.id,
        subscription: this.mapStripeSubscription(subscription),
      };

      // Include payment intent if available
      if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
        const invoice = subscription.latest_invoice as Stripe.Invoice;
        if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
          response.paymentIntent = this.mapStripePaymentIntent(
            invoice.payment_intent as Stripe.PaymentIntent
          );
        }
      }

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to create subscription');
    }
  }

  /**
   * Update a subscription
   *
   * @param subscriptionId Subscription ID
   * @param updates Subscription updates
   * @returns Updated subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<CreateStripeSubscriptionParams>
  ): Promise<StripeServiceResponse<StripeSubscription>> {
    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {};

      if (updates.metadata) {
        updateParams.metadata = updates.metadata;
      }

      // Handle plan changes if amount or interval changes
      if (updates.amount !== undefined || updates.interval !== undefined) {
        // This would require updating the subscription items
        // Implementation depends on your pricing model
      }

      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        updateParams
      );

      return {
        success: true,
        data: this.mapStripeSubscription(subscription),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to update subscription');
    }
  }

  /**
   * Cancel a subscription
   *
   * @param subscriptionId Subscription ID
   * @param immediately Whether to cancel immediately or at period end
   * @returns Canceled subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<StripeServiceResponse<StripeSubscription>> {
    try {
      let subscription: Stripe.Subscription;

      if (immediately) {
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      return {
        success: true,
        data: this.mapStripeSubscription(subscription),
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to cancel subscription');
    }
  }

  // ============================================================================
  // WEBHOOK HANDLING
  // ============================================================================

  /**
   * Verify webhook signature (static for webhook handlers)
   *
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @param signature stripe-signature header
   * @param payload Raw request body (string)
   * @param secret Webhook secret from Stripe dashboard
   * @returns Verification result with parsed event
   *
   * @example
   * ```typescript
   * const result = StripeService.verifyWebhookSignature(
   *   request.headers['stripe-signature'],
   *   request.body,
   *   process.env.STRIPE_WEBHOOK_SECRET
   * );
   *
   * if (result.valid && result.event) {
   *   console.log('Valid event:', result.event.type);
   * }
   * ```
   */
  static verifyWebhookSignature(
    signature: string,
    payload: string,
    secret: string
  ): WebhookVerificationResult {
    try {
      if (!signature || !payload || !secret) {
        return {
          valid: false,
          error: 'Missing required parameters for webhook verification',
        };
      }

      // Parse the signature header
      const elements = signature.split(',');
      const signatures: string[] = [];
      let timestamp = '';

      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't') {
          timestamp = value;
        } else if (key === 'v1') {
          signatures.push(value);
        }
      }

      if (!timestamp || signatures.length === 0) {
        return {
          valid: false,
          error: 'Invalid signature format',
        };
      }

      // Check timestamp to prevent replay attacks (5 minute tolerance)
      const timestampNum = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const tolerance = 300; // 5 minutes

      if (currentTime - timestampNum > tolerance) {
        return {
          valid: false,
          error: 'Webhook timestamp too old (possible replay attack)',
        };
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      // Timing-safe comparison
      let valid = false;
      for (const sig of signatures) {
        const sigBuffer = Buffer.from(sig, 'hex');
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');

        if (sigBuffer.length === expectedBuffer.length) {
          if (crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            valid = true;
            break;
          }
        }
      }

      if (valid) {
        // Parse the event
        const event = JSON.parse(payload) as StripeWebhookEvent;
        return {
          valid: true,
          event,
        };
      }

      return {
        valid: false,
        error: 'Invalid webhook signature',
      };
    } catch (error: any) {
      console.error('Webhook verification error:', error);
      return {
        valid: false,
        error: `Webhook verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Construct webhook event using Stripe SDK (alternative method)
   *
   * @param signature stripe-signature header
   * @param payload Raw request body
   * @param secret Webhook secret
   * @returns Verified webhook event
   */
  static constructWebhookEvent(
    signature: string,
    payload: string | Buffer,
    secret: string
  ): StripeWebhookEvent | null {
    try {
      // This requires access to the Stripe instance, so we use the singleton
      const stripe = StripeService.getInstance();
      const event = stripe.stripe.webhooks.constructEvent(payload, signature, secret);
      return event as StripeWebhookEvent;
    } catch (error: any) {
      console.error('Failed to construct webhook event:', error);
      return null;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate idempotency key for payment operations
   *
   * @param customerId Customer ID
   * @param amount Payment amount
   * @param invoiceId Invoice ID (optional)
   * @returns Idempotency key
   */
  private generateIdempotencyKey(
    customerId: string,
    amount: number,
    invoiceId: string
  ): string {
    const timestamp = Date.now();
    const data = `${customerId}-${amount}-${invoiceId}-${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get or create a price for subscription
   *
   * @param amount Amount in dollars
   * @param interval Billing interval
   * @param planType Plan type
   * @returns Price ID
   */
  private async getOrCreatePrice(
    amount: number,
    interval: 'month' | 'year',
    planType: string
  ): Promise<string | null> {
    try {
      // Search for existing price
      const prices = await this.stripe.prices.list({
        active: true,
        type: 'recurring',
        limit: 100,
      });

      const amountInCents = dollarsToCents(amount);
      const existingPrice = prices.data.find(
        p =>
          p.unit_amount === amountInCents &&
          p.recurring?.interval === interval &&
          p.metadata?.plan_type === planType
      );

      if (existingPrice) {
        return existingPrice.id;
      }

      // Create new price
      const price = await this.stripe.prices.create({
        unit_amount: amountInCents,
        currency: 'usd',
        recurring: {
          interval,
          interval_count: 1,
        },
        metadata: {
          plan_type: planType,
        },
        nickname: `${planType} - ${interval}ly`,
      });

      return price.id;
    } catch (error: any) {
      console.error('Failed to get/create price:', error);
      return null;
    }
  }

  /**
   * Calculate billing anchor timestamp
   *
   * @param dayOfMonth Day of month (1-31)
   * @returns Unix timestamp for billing anchor
   */
  private calculateBillingAnchor(dayOfMonth: number): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Create date for the specified day
    let anchorDate = new Date(year, month, dayOfMonth);

    // If the date is in the past, move to next month
    if (anchorDate.getTime() < now.getTime()) {
      anchorDate = new Date(year, month + 1, dayOfMonth);
    }

    return Math.floor(anchorDate.getTime() / 1000);
  }

  /**
   * Map Stripe customer to our type
   */
  private mapStripeCustomer(customer: Stripe.Customer): StripeCustomer {
    return {
      id: customer.id,
      email: customer.email || '',
      name: customer.name || '',
      phone: customer.phone || undefined,
      description: customer.description || undefined,
      invoice_settings: customer.invoice_settings,
      metadata: customer.metadata,
      address: customer.address || undefined,
      balance: customer.balance || 0,
      created: customer.created,
      deleted: false,
    };
  }

  /**
   * Map Stripe payment method to our type
   */
  private mapStripePaymentMethod(pm: Stripe.PaymentMethod): StripePaymentMethod {
    return {
      id: pm.id,
      type: pm.type as any,
      us_bank_account: pm.us_bank_account
        ? {
            id: pm.id,
            account_type: pm.us_bank_account.account_type as any,
            account_holder_type: pm.us_bank_account.account_holder_type as any,
            bank_name: pm.us_bank_account.bank_name || '',
            fingerprint: pm.us_bank_account.fingerprint || '',
            last4: pm.us_bank_account.last4 || '',
            routing_number: pm.us_bank_account.routing_number || '',
            status: pm.us_bank_account.status_details?.blocked
              ? 'errored'
              : 'verified',
          }
        : undefined,
      card: pm.card as any,
      billing_details: pm.billing_details as any,
      customer: typeof pm.customer === 'string' ? pm.customer : pm.customer?.id,
      created: pm.created,
      metadata: pm.metadata,
    };
  }

  /**
   * Map Stripe payment intent to our type
   */
  private mapStripePaymentIntent(pi: Stripe.PaymentIntent): StripePaymentIntent {
    return {
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status as StripePaymentStatus,
      customer: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id || '',
      payment_method: typeof pi.payment_method === 'string'
        ? pi.payment_method
        : pi.payment_method?.id,
      client_secret: pi.client_secret || '',
      confirmation_method: pi.confirmation_method as any,
      description: pi.description || undefined,
      metadata: pi.metadata,
      mandate_data: pi.mandate_data as any,
      latest_charge: typeof pi.latest_charge === 'string'
        ? pi.latest_charge
        : pi.latest_charge?.id,
      created: pi.created,
      next_action: pi.next_action as any,
      last_payment_error: pi.last_payment_error as any,
    };
  }

  /**
   * Map Stripe subscription to our type
   */
  private mapStripeSubscription(sub: Stripe.Subscription): StripeSubscription {
    return {
      id: sub.id,
      customer: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      status: sub.status as StripeSubscriptionStatus,
      items: {
        data: sub.items.data.map(item => ({
          id: item.id,
          price: {
            id: typeof item.price === 'string' ? item.price : item.price.id,
            unit_amount: typeof item.price === 'object' ? item.price.unit_amount || 0 : 0,
            currency: typeof item.price === 'object' ? item.price.currency : 'usd',
            recurring: typeof item.price === 'object' && item.price.recurring
              ? {
                  interval: item.price.recurring.interval as any,
                }
              : {
                  interval: 'month' as any,
                },
          },
        })),
      },
      default_payment_method: typeof sub.default_payment_method === 'string'
        ? sub.default_payment_method
        : sub.default_payment_method?.id,
      latest_invoice: typeof sub.latest_invoice === 'string'
        ? sub.latest_invoice
        : sub.latest_invoice?.id,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      trial_start: sub.trial_start || undefined,
      trial_end: sub.trial_end || undefined,
      canceled_at: sub.canceled_at || undefined,
      cancel_at_period_end: sub.cancel_at_period_end,
      metadata: sub.metadata,
      created: sub.created,
    };
  }

  /**
   * Handle Stripe API errors with proper typing and user-friendly messages
   */
  private handleError(error: any, context: string): StripeServiceResponse {
    console.error(`${context}:`, error);

    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'An unknown error occurred';
    let userMessage = 'An error occurred. Please try again.';
    let retryable = false;

    if (error.type && error.code) {
      // Stripe error
      const stripeError = error as StripeError;
      errorCode = stripeError.code || stripeError.type;
      errorMessage = stripeError.message;

      // Check if retryable
      retryable = isRetryableStripeError(stripeError);

      // Generate user-friendly message based on error code
      userMessage = this.getUserFriendlyErrorMessage(stripeError);
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Never expose sensitive information in user messages
    userMessage = this.sanitizeErrorMessage(userMessage);

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        userMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined,
        retryable,
      },
    };
  }

  /**
   * Get user-friendly error message for Stripe errors
   */
  private getUserFriendlyErrorMessage(error: StripeError): string {
    const errorMessages: Record<string, string> = {
      // ACH specific errors
      account_closed: 'The bank account is closed. Please use a different account.',
      account_frozen: 'The bank account is frozen. Please contact your bank.',
      insufficient_funds: 'Insufficient funds in the bank account.',
      invalid_account_number: 'Invalid bank account number. Please check and try again.',
      invalid_routing_number: 'Invalid routing number. Please check and try again.',
      bank_account_declined: 'Bank account was declined. Please try a different account.',
      bank_account_restricted: 'Bank account has restrictions. Please contact your bank.',
      bank_account_unusable: 'Bank account cannot be used for payments.',
      debit_not_authorized: 'ACH debit not authorized. Please verify your bank account.',

      // Payment errors
      payment_intent_authentication_failure: 'Payment authentication failed. Please try again.',
      payment_intent_payment_attempt_failed: 'Payment attempt failed. Please try again.',
      payment_method_invalid: 'Invalid payment method. Please add a new bank account.',

      // Customer errors
      customer_not_found: 'Customer account not found.',
      duplicate_customer: 'Customer already exists.',

      // General errors
      api_key_expired: 'Configuration error. Please contact support.',
      rate_limit: 'Too many requests. Please wait and try again.',
      processing_error: 'Payment processing error. Please try again.',

      // API errors
      api_error: 'Service temporarily unavailable. Please try again.',
      api_connection_error: 'Connection error. Please check your internet and try again.',
      authentication_error: 'Authentication failed. Please contact support.',
      invalid_request_error: 'Invalid request. Please check your information.',
      idempotency_error: 'Duplicate request detected. Please refresh and try again.',
    };

    return errorMessages[error.code || ''] || error.message || 'An error occurred. Please try again.';
  }

  /**
   * Sanitize error messages to remove sensitive information
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove any API keys, tokens, or IDs
    return message
      .replace(/sk_[a-zA-Z0-9]+/g, '[REDACTED]')
      .replace(/pk_[a-zA-Z0-9]+/g, '[REDACTED]')
      .replace(/btok_[a-zA-Z0-9]+/g, '[REDACTED]')
      .replace(/pi_[a-zA-Z0-9]+/g, '[PAYMENT_ID]')
      .replace(/pm_[a-zA-Z0-9]+/g, '[METHOD_ID]')
      .replace(/cus_[a-zA-Z0-9]+/g, '[CUSTOMER_ID]')
      .replace(/sub_[a-zA-Z0-9]+/g, '[SUBSCRIPTION_ID]');
  }
}

// Export singleton instance
export const stripe = StripeService.getInstance();

// Export class for testing and custom instances
export default StripeService;