/**
 * STRIPE WEBHOOK HANDLER
 *
 * Processes Stripe webhook events for payment lifecycle management.
 * Replaces webhook-dwolla.js with Stripe-specific event handling.
 *
 * KEY EVENTS HANDLED:
 * - payment_intent.succeeded: ACH payment cleared, trigger company creation
 * - payment_intent.payment_failed: ACH payment failed, update status and notify
 * - payment_intent.processing: Payment is being processed
 * - payment_intent.canceled: Payment was canceled
 * - customer.updated: Customer information changed
 * - payment_method.attached: New payment method added
 * - payment_method.detached: Payment method removed
 *
 * SECURITY:
 * - Verifies webhook signature using Stripe webhook secret
 * - Uses timing-safe comparison to prevent timing attacks
 * - Validates event authenticity before processing
 *
 * @see DATABASE-MIGRATION-VALIDATION.md
 * @see STRIPE-PLAID-ARCHITECTURE.md
 * @see SECURITY-IMPLEMENTATION-GUIDE.md
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Verify Stripe webhook signature
 * Uses Stripe's built-in signature verification for security
 */
function verifyStripeSignature(payload, signature, secret) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia'
    });
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return { valid: true, event };
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { valid: false, error: err.message };
  }
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get signature and webhook secret
    const signature = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Webhook secret not configured' })
      };
    }

    if (!signature) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing Stripe signature' })
      };
    }

    // Verify webhook signature
    const { valid, event: stripeEvent, error: verifyError } = verifyStripeSignature(
      event.body,
      signature,
      webhookSecret
    );

    if (!valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid signature', details: verifyError })
      };
    }

    console.log(`Received Stripe webhook: ${stripeEvent.type} (${stripeEvent.id})`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Store webhook event in database (for audit trail)
    const { error: webhookInsertError } = await supabase
      .from('stripe_webhooks')
      .insert({
        event_type: stripeEvent.type,
        payload: stripeEvent,
        processed: false,
        retry_count: 0,
        created_at: new Date().toISOString()
      });

    if (webhookInsertError) {
      console.error('Failed to store webhook:', webhookInsertError);
      // Continue processing even if storage fails
    }

    // Handle different webhook events
    let processed = false;
    let processingError = null;

    try {
      switch (stripeEvent.type) {
        // Subscription Events (PRIMARY for recurring billing)
        case 'customer.subscription.created':
          await handleSubscriptionCreated(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'invoice.payment_succeeded':
          // CRITICAL: First successful invoice payment triggers company creation
          await handleInvoicePaymentSucceeded(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'invoice.finalized':
          await handleInvoiceFinalized(stripeEvent.data.object, supabase);
          processed = true;
          break;

        // Legacy Payment Intent Events (kept for backwards compatibility)
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'payment_intent.processing':
          await handlePaymentIntentProcessing(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'charge.succeeded':
          await handleChargeSucceeded(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'charge.failed':
          await handleChargeFailed(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'customer.updated':
          await handleCustomerUpdated(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'payment_method.attached':
          await handlePaymentMethodAttached(stripeEvent.data.object, supabase);
          processed = true;
          break;

        case 'payment_method.detached':
          await handlePaymentMethodDetached(stripeEvent.data.object, supabase);
          processed = true;
          break;

        default:
          console.log(`Unhandled webhook type: ${stripeEvent.type}`);
          processed = true; // Mark as processed to avoid retries
      }
    } catch (handlerError) {
      console.error(`Error handling ${stripeEvent.type}:`, handlerError);
      processingError = handlerError.message;
      processed = false;
    }

    // Update webhook record with processing status
    if (!webhookInsertError) {
      await supabase
        .from('stripe_webhooks')
        .update({
          processed,
          processed_at: processed ? new Date().toISOString() : null,
          error: processingError
        })
        .eq('payload->id', stripeEvent.id);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        eventId: stripeEvent.id,
        eventType: stripeEvent.type,
        processed
      })
    };

  } catch (error) {
    console.error('Error processing Stripe webhook:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message
      })
    };
  }
};

/**
 * Handle payment_intent.succeeded event
 * Payment cleared successfully - create company and user accounts
 */
async function handlePaymentIntentSucceeded(paymentIntent, supabase) {
  console.log(`Payment succeeded: ${paymentIntent.id}`);

  // Update payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      ach_status: 'cleared',
      processed_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .select()
    .single();

  if (paymentError) {
    console.error('Failed to update payment:', paymentError);
    throw new Error(`Payment update failed: ${paymentError.message}`);
  }

  if (!payment) {
    console.log('Payment not found for payment intent:', paymentIntent.id);
    return;
  }

  // Check if company already exists
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('stripe_customer_id', paymentIntent.customer)
    .single();

  if (existingCompany) {
    console.log('Company already exists:', existingCompany.id);
    return;
  }

  // Trigger company creation
  const metadata = paymentIntent.metadata || {};
  const createCompanyUrl = `${process.env.FRONTEND_URL}/.netlify/functions/create-company`;

  try {
    const response = await fetch(createCompanyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: payment.id,
        companyEmail: metadata.company_email || payment.company_email,
        companyName: metadata.company_name || payment.company_name,
        stripeCustomerId: paymentIntent.customer,
        stripePaymentMethodId: paymentIntent.payment_method,
        ownerName: metadata.owner_name || 'Company Owner',
        subscriptionTier: metadata.subscription_tier || 'growth'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Company creation failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Company created successfully:', result.companyId);
  } catch (error) {
    console.error('Failed to create company:', error);
    throw error;
  }
}

/**
 * Handle payment_intent.payment_failed event
 * ACH payment failed - update status and notify
 */
async function handlePaymentIntentFailed(paymentIntent, supabase) {
  console.log(`Payment failed: ${paymentIntent.id}`);

  const lastError = paymentIntent.last_payment_error || {};
  const failureCode = lastError.code || 'unknown';
  const failureMessage = lastError.message || 'Payment failed';

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      ach_status: 'failed',
      failure_code: failureCode,
      failure_message: failureMessage,
      processed_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  console.log(`Payment ${paymentIntent.id} marked as failed: ${failureCode}`);

  // TODO: Send failure notification email to customer
}

/**
 * Handle payment_intent.processing event
 * Payment is being processed (ACH clearing)
 */
async function handlePaymentIntentProcessing(paymentIntent, supabase) {
  console.log(`Payment processing: ${paymentIntent.id}`);

  await supabase
    .from('payments')
    .update({
      status: 'processing',
      ach_status: 'pending'
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

/**
 * Handle payment_intent.canceled event
 * Payment was canceled
 */
async function handlePaymentIntentCanceled(paymentIntent, supabase) {
  console.log(`Payment canceled: ${paymentIntent.id}`);

  await supabase
    .from('payments')
    .update({
      status: 'canceled',
      ach_status: 'canceled',
      processed_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

/**
 * Handle charge.succeeded event
 * Charge succeeded (can be used for additional tracking)
 */
async function handleChargeSucceeded(charge, supabase) {
  console.log(`Charge succeeded: ${charge.id}`);

  // Update payment record with charge ID if not already set
  await supabase
    .from('payments')
    .update({
      stripe_charge_id: charge.id
    })
    .eq('stripe_payment_intent_id', charge.payment_intent)
    .is('stripe_charge_id', null);
}

/**
 * Handle charge.failed event
 * Charge failed (additional failure tracking)
 */
async function handleChargeFailed(charge, supabase) {
  console.log(`Charge failed: ${charge.id}`);

  const failureCode = charge.failure_code || 'unknown';
  const failureMessage = charge.failure_message || 'Charge failed';

  await supabase
    .from('payments')
    .update({
      stripe_charge_id: charge.id,
      failure_code: failureCode,
      failure_message: failureMessage
    })
    .eq('stripe_payment_intent_id', charge.payment_intent);
}

/**
 * Handle customer.updated event
 * Customer information was updated
 */
async function handleCustomerUpdated(customer, supabase) {
  console.log(`Customer updated: ${customer.id}`);

  // Update company record with latest customer information
  await supabase
    .from('companies')
    .update({
      billing_email: customer.email,
      billing_name: customer.name,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customer.id);
}

/**
 * Handle payment_method.attached event
 * New payment method was attached to customer
 */
async function handlePaymentMethodAttached(paymentMethod, supabase) {
  console.log(`Payment method attached: ${paymentMethod.id} to customer ${paymentMethod.customer}`);

  // Update company record with new payment method
  await supabase
    .from('companies')
    .update({
      stripe_payment_method_id: paymentMethod.id,
      payment_method_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', paymentMethod.customer);
}

/**
 * Handle payment_method.detached event
 * Payment method was removed from customer
 */
async function handlePaymentMethodDetached(paymentMethod, supabase) {
  console.log(`Payment method detached: ${paymentMethod.id}`);

  // Mark payment method as inactive if it was the active one
  await supabase
    .from('companies')
    .update({
      payment_method_status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_method_id', paymentMethod.id);
}

/**
 * Handle customer.subscription.created event
 * New subscription was created
 */
async function handleSubscriptionCreated(subscription, supabase) {
  console.log(`Subscription created: ${subscription.id} for customer ${subscription.customer}`);

  // Update company with subscription details
  const { error } = await supabase
    .from('companies')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_tier: subscription.metadata?.subscription_tier || 'growth',
      subscription_started_at: new Date(subscription.created * 1000).toISOString(),
      next_billing_date: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
      monthly_amount: subscription.items.data[0]?.price.unit_amount / 100,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', subscription.customer);

  if (error) {
    console.error('Failed to update company with subscription:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 * Subscription was modified (plan change, cancellation scheduled, etc.)
 */
async function handleSubscriptionUpdated(subscription, supabase) {
  console.log(`Subscription updated: ${subscription.id} (status: ${subscription.status})`);

  const updateData = {
    subscription_status: subscription.status,
    next_billing_date: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
    monthly_amount: subscription.items.data[0]?.price.unit_amount / 100,
    updated_at: new Date().toISOString()
  };

  // Handle cancellation
  if (subscription.canceled_at) {
    updateData.cancelled_at = new Date(subscription.canceled_at * 1000).toISOString();
    updateData.cancellation_reason = subscription.cancellation_details?.reason || 'customer_request';
  }

  // Update subscription tier if changed
  if (subscription.metadata?.subscription_tier) {
    updateData.subscription_tier = subscription.metadata.subscription_tier;
  }

  const { error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to update subscription:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 * Subscription was cancelled and has ended
 */
async function handleSubscriptionDeleted(subscription, supabase) {
  console.log(`Subscription deleted: ${subscription.id}`);

  const { error } = await supabase
    .from('companies')
    .update({
      subscription_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: subscription.cancellation_details?.reason || 'subscription_ended',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to mark subscription as cancelled:', error);
    throw error;
  }

  // TODO: Send cancellation email
  // TODO: Revoke app access after grace period
}

/**
 * Handle invoice.payment_succeeded event
 * CRITICAL: This is where we trigger company creation on first payment
 */
async function handleInvoicePaymentSucceeded(invoice, supabase) {
  console.log(`Invoice payment succeeded: ${invoice.id} for subscription ${invoice.subscription}`);

  // Check if this is the first invoice (subscription creation)
  const isFirstInvoice = invoice.billing_reason === 'subscription_create';

  if (isFirstInvoice) {
    console.log('First invoice paid - triggering company creation');

    // Get subscription details
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia'
    });

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const customer = await stripe.customers.retrieve(invoice.customer);

    // Check if company already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('stripe_customer_id', customer.id)
      .single();

    if (!existingCompany) {
      // Create company via create-company function
      const createCompanyUrl = `${process.env.FRONTEND_URL}/.netlify/functions/create-company`;

      try {
        const response = await fetch(createCompanyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyEmail: customer.email,
            companyName: customer.metadata?.company_name || customer.name,
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            stripePaymentMethodId: invoice.payment_intent?.payment_method || subscription.default_payment_method,
            ownerName: customer.metadata?.owner_name || customer.name,
            subscriptionTier: subscription.metadata?.subscription_tier || 'growth',
            invoiceId: invoice.id,
            amountPaid: invoice.amount_paid / 100 // Convert from cents
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Company creation failed: ${errorText}`);
        }

        const result = await response.json();
        console.log('Company created successfully:', result.companyId);
      } catch (error) {
        console.error('Failed to create company:', error);
        throw error;
      }
    } else {
      console.log('Company already exists, skipping creation');
    }
  }

  // Update payment record for the invoice
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      company_id: null, // Will be linked later via stripe_customer_id
      amount: invoice.amount_paid / 100,
      status: 'succeeded',
      payment_type: isFirstInvoice ? 'initial_subscription' : 'subscription_renewal',
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription,
      stripe_payment_intent_id: invoice.payment_intent,
      stripe_charge_id: invoice.charge,
      subscription_period_start: new Date(invoice.period_start * 1000).toISOString().split('T')[0],
      subscription_period_end: new Date(invoice.period_end * 1000).toISOString().split('T')[0],
      ach_status: 'cleared',
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

  if (paymentError) {
    console.error('Failed to create payment record:', paymentError);
  }

  // Update next billing date
  await supabase
    .from('companies')
    .update({
      next_billing_date: invoice.next_payment_attempt ?
        new Date(invoice.next_payment_attempt * 1000).toISOString().split('T')[0] : null,
      payment_failure_count: 0, // Reset failure count on successful payment
      last_payment_failed_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', invoice.customer);
}

/**
 * Handle invoice.payment_failed event
 * Recurring payment failed
 */
async function handleInvoicePaymentFailed(invoice, supabase) {
  console.log(`Invoice payment failed: ${invoice.id} for subscription ${invoice.subscription}`);

  // Record failed payment
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      amount: invoice.amount_due / 100,
      status: 'failed',
      payment_type: 'subscription_renewal',
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription,
      subscription_period_start: new Date(invoice.period_start * 1000).toISOString().split('T')[0],
      subscription_period_end: new Date(invoice.period_end * 1000).toISOString().split('T')[0],
      ach_status: 'failed',
      failure_code: invoice.last_payment_error?.code || 'payment_failed',
      failure_message: invoice.last_payment_error?.message || 'Payment failed',
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

  if (paymentError) {
    console.error('Failed to record payment failure:', paymentError);
  }

  // Update company with failure details
  const { data: company } = await supabase
    .from('companies')
    .select('payment_failure_count')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  await supabase
    .from('companies')
    .update({
      payment_failure_count: (company?.payment_failure_count || 0) + 1,
      last_payment_failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription);

  // TODO: Send payment failure email
  // TODO: If multiple failures, consider suspending access
}

/**
 * Handle invoice.finalized event
 * Invoice has been finalized and is ready for payment
 */
async function handleInvoiceFinalized(invoice, supabase) {
  console.log(`Invoice finalized: ${invoice.id} for ${invoice.amount_due / 100} ${invoice.currency.toUpperCase()}`);

  // This is primarily for logging/tracking
  // The actual payment processing happens in invoice.payment_succeeded
}
