/**
 * CREATE SUBSCRIPTION SETUP
 *
 * Creates a Stripe Subscription with Payment Element for ACH payments.
 * Stripe Payment Element has BUILT-IN Plaid support - no separate integration needed!
 *
 * FLOW:
 * 1. Frontend collects company info
 * 2. Backend creates Stripe Customer
 * 3. Backend creates Subscription with payment_behavior: 'default_incomplete'
 * 4. Returns client_secret for Payment Element
 * 5. Frontend mounts Payment Element configured for us_bank_account (ACH via Plaid)
 * 6. User completes bank verification through Stripe's built-in Plaid
 * 7. Webhook handles subscription activation and company creation
 *
 * @returns {Object} Contains client_secret for Payment Element and subscription details
 */

const { z } = require('zod');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Input validation schema
const setupSchema = z.object({
  // Company information
  companyName: z.string().min(2).max(100),
  companyEmail: z.string().email(),
  ownerName: z.string().min(2).max(100),
  phone: z.string().optional(),

  // Subscription selection
  subscriptionTier: z.enum(['starter', 'growth', 'enterprise']).default('growth'),

  // Optional metadata
  metadata: z.record(z.string()).optional()
});

// Subscription pricing lookup
const SUBSCRIPTION_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder',
  growth: process.env.STRIPE_PRICE_GROWTH || 'price_growth_placeholder',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_placeholder'
};

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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
    // Parse and validate input
    const body = JSON.parse(event.body);
    const validatedData = setupSchema.parse(body);

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia'
    });

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log(`Creating subscription setup for ${validatedData.companyEmail} - ${validatedData.subscriptionTier} tier`);

    // STEP 1: Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: validatedData.companyEmail,
      limit: 1
    });

    let customer;

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log(`Found existing Stripe customer: ${customer.id}`);

      // Check if customer already has an active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Customer already has an active subscription',
            customerId: customer.id,
            subscriptionId: subscriptions.data[0].id
          })
        };
      }
    } else {
      // STEP 2: Create new Stripe customer
      console.log('Creating new Stripe customer...');
      customer = await stripe.customers.create({
        email: validatedData.companyEmail,
        name: validatedData.companyName,
        description: `${validatedData.companyName} - ${validatedData.subscriptionTier} tier`,
        phone: validatedData.phone,
        metadata: {
          company_name: validatedData.companyName,
          owner_name: validatedData.ownerName,
          subscription_tier: validatedData.subscriptionTier,
          source: 'website_signup',
          ...validatedData.metadata
        }
      });
      console.log(`Stripe customer created: ${customer.id}`);
    }

    // STEP 3: Create subscription with setup intent
    console.log('Creating subscription with setup intent...');

    const priceId = SUBSCRIPTION_PRICES[validatedData.subscriptionTier];

    if (!priceId || priceId.includes('placeholder')) {
      throw new Error(`Price ID not configured for tier: ${validatedData.subscriptionTier}. Please set STRIPE_PRICE_${validatedData.subscriptionTier.toUpperCase()} environment variable.`);
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: priceId,
      }],
      // CRITICAL: This creates a SetupIntent first, payment collected after verification
      payment_behavior: 'default_incomplete',
      payment_settings: {
        // Only allow ACH payments via US bank account
        payment_method_types: ['us_bank_account'],
        // Save payment method as default for future invoices
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      metadata: {
        company_name: validatedData.companyName,
        owner_name: validatedData.ownerName,
        subscription_tier: validatedData.subscriptionTier
      }
    });

    console.log(`Subscription created: ${subscription.id} (status: ${subscription.status})`);

    // STEP 4: Get the client secret from the SetupIntent
    let clientSecret;
    let intentType;
    let intentId;

    if (subscription.pending_setup_intent) {
      // Setup intent for collecting payment method first
      clientSecret = subscription.pending_setup_intent.client_secret;
      intentType = 'setup';
      intentId = subscription.pending_setup_intent.id;
    } else if (subscription.latest_invoice?.payment_intent) {
      // Payment intent if immediate payment is required
      clientSecret = subscription.latest_invoice.payment_intent.client_secret;
      intentType = 'payment';
      intentId = subscription.latest_invoice.payment_intent.id;
    } else {
      throw new Error('No setup intent or payment intent found on subscription');
    }

    console.log(`${intentType} intent created: ${intentId}`);

    // STEP 5: Store initial subscription record in database
    const subscriptionAmount = subscription.items.data[0].price.unit_amount / 100; // Convert cents to dollars

    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert({
        amount: subscriptionAmount,
        status: 'pending',
        payment_type: 'subscription_setup',
        subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString().split('T')[0],
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
        ach_status: 'pending',
        stripe_subscription_id: subscription.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to create payment record:', dbError);
      // Continue anyway - webhook will handle this
    }

    // STEP 6: Update companies table with Stripe IDs (if company exists)
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('email', validatedData.companyEmail)
      .single();

    if (existingCompany) {
      await supabase
        .from('companies')
        .update({
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          subscription_tier: validatedData.subscriptionTier,
          subscription_status: subscription.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCompany.id);
    }

    // Return response with client secret for Payment Element
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        clientSecret,
        intentType,
        intentId,
        customerId: customer.id,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        paymentId: payment?.id,
        priceId,
        amount: subscriptionAmount,
        currency: subscription.currency,
        billingCycleAnchor: subscription.billing_cycle_anchor,
        currentPeriodEnd: subscription.current_period_end,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        message: 'Subscription created. Please complete bank account verification.',
        instructions: {
          frontend: 'Use the clientSecret to mount Stripe Payment Element',
          paymentElement: {
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#0570de'
              }
            },
            options: {
              // Restrict to ACH only
              paymentMethodTypes: ['us_bank_account']
            }
          }
        }
      })
    };

  } catch (error) {
    console.error('Error in create-subscription-setup:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Validation error',
          details: error.errors
        })
      };
    }

    // Handle Stripe errors
    if (error.type && error.type.startsWith('Stripe')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Stripe error',
          message: error.message,
          code: error.code,
          type: error.type
        })
      };
    }

    // Generic error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'Failed to create subscription setup'
      })
    };
  }
};
