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
