/**
 * PROCESS INITIAL PAYMENT
 *
 * Processes the first subscription payment after SetupIntent is confirmed.
 * Called by frontend after successful bank account verification via Plaid.
 *
 * FLOW:
 * 1. Frontend confirms SetupIntent and gets payment_method ID
 * 2. Frontend calls this endpoint with payment_method and customer details
 * 3. Backend creates PaymentIntent for first subscription charge
 * 4. Backend creates payment record in database
 * 5. Webhook handles company creation when payment clears
 *
 * @see create-subscription-setup.js
 * @see webhook-stripe.js
 * @see STRIPE-PLAID-ARCHITECTURE.md
 */

const { z } = require('zod');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Input validation schema
const paymentSchema = z.object({
  customerId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  companyEmail: z.string().email(),
  companyName: z.string().min(2).max(100),
  ownerName: z.string().min(2).max(100).optional(),
  subscriptionTier: z.enum(['starter', 'growth', 'enterprise']).default('growth')
});

// Subscription pricing (in dollars)
const SUBSCRIPTION_PRICING = {
  starter: 99.00,
  growth: 299.00,
  enterprise: 2000.00
};

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Convert dollars to cents for Stripe API
 */
function dollarsToCents(dollars) {
  return Math.round(dollars * 100);
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

  let paymentRecord = null;

  try {
    // Parse and validate input
    const body = JSON.parse(event.body);
    const validatedData = paymentSchema.parse(body);

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia'
    });

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Calculate subscription amount
    const subscriptionAmount = SUBSCRIPTION_PRICING[validatedData.subscriptionTier];
    const amountInCents = dollarsToCents(subscriptionAmount);

    console.log(`Processing initial payment for ${validatedData.companyEmail} - ${validatedData.subscriptionTier} tier ($${subscriptionAmount})`);

    // Get payment method details for record keeping
    const paymentMethod = await stripe.paymentMethods.retrieve(validatedData.paymentMethodId);
    const bankAccount = paymentMethod.us_bank_account || {};
    const bankLast4 = bankAccount.last4 || '****';
    const bankName = bankAccount.bank_name || 'Bank Account';

    // STEP 1: Create payment record in database
    console.log('Step 1: Creating payment record in database...');
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert({
        company_email: validatedData.companyEmail,
        company_name: validatedData.companyName,
        amount: subscriptionAmount,
        status: 'pending',
        payment_type: 'initial_subscription',
        bank_account_name: bankName,
        bank_account_last4: bankLast4,
        ach_status: 'pending',
        subscription_period_start: new Date().toISOString().split('T')[0],
        subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    paymentRecord = payment;
    console.log(`Payment record created: ${payment.id}`);

    // STEP 2: Create PaymentIntent for first subscription payment
    console.log('Step 2: Creating Stripe payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: validatedData.customerId,
      payment_method: validatedData.paymentMethodId,
      payment_method_types: ['us_bank_account'],
      confirm: true, // Immediately confirm the payment
      description: `${validatedData.companyName} - Initial ${validatedData.subscriptionTier} subscription`,
      metadata: {
        company_email: validatedData.companyEmail,
        company_name: validatedData.companyName,
        owner_name: validatedData.ownerName || validatedData.companyName,
        subscription_tier: validatedData.subscriptionTier,
        payment_id: payment.id,
        type: 'initial_subscription'
      }
    });

    console.log(`Payment intent created: ${paymentIntent.id} (status: ${paymentIntent.status})`);

    // STEP 3: Update payment record with Stripe IDs
    console.log('Step 3: Updating payment record with Stripe IDs...');
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
        ach_status: paymentIntent.status === 'succeeded' ? 'cleared' : 'pending',
        processed_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment record:', updateError);
    }

    // STEP 4: If payment succeeded immediately, trigger company creation
    // (Usually ACH payments are async, so this will be handled by webhook)
    let companyCreated = false;
    let companyId = null;
    let userId = null;

    if (paymentIntent.status === 'succeeded') {
      console.log('Step 4: Payment succeeded immediately, creating company...');

      try {
        const createCompanyUrl = `${process.env.FRONTEND_URL}/.netlify/functions/create-company`;
        const companyResponse = await fetch(createCompanyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: payment.id,
            companyEmail: validatedData.companyEmail,
            companyName: validatedData.companyName,
            stripeCustomerId: validatedData.customerId,
            stripePaymentMethodId: validatedData.paymentMethodId,
            ownerName: validatedData.ownerName || validatedData.companyName,
            subscriptionTier: validatedData.subscriptionTier
          })
        });

        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          companyCreated = true;
          companyId = companyData.companyId;
          userId = companyData.userId;
          console.log('Company created successfully:', companyId);
        } else {
          console.error('Failed to create company:', await companyResponse.text());
        }
      } catch (companyError) {
        console.error('Error creating company:', companyError);
      }
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
        amount: subscriptionAmount,
        subscriptionTier: validatedData.subscriptionTier,
        bankLast4: bankLast4,
        companyCreated,
        companyId,
        userId,
        message: paymentIntent.status === 'succeeded'
          ? 'Payment successful! Your company account has been created.'
          : 'Payment initiated successfully. ACH processing typically takes 3-5 business days. You will receive an email when your account is ready.',
        nextSteps: paymentIntent.status === 'succeeded'
          ? [
              'Check your email for login credentials',
              'Log in to your account',
              'Complete your company profile',
              'Start using Tradesphere'
            ]
          : [
              'Wait for ACH payment to clear (3-5 business days)',
              'You will receive an email with login credentials once payment clears',
              'Log in and complete your company profile',
              'Start using Tradesphere'
            ]
      })
    };

  } catch (error) {
    console.error('Error processing initial payment:', error);

    // Rollback payment record if it was created
    if (paymentRecord) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_code: error.code || 'unknown_error',
            failure_message: error.message || 'Payment processing failed'
          })
          .eq('id', paymentRecord.id);
      } catch (rollbackError) {
        console.error('Failed to rollback payment record:', rollbackError);
      }
    }

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
          error: 'Payment processing failed',
          message: error.message || 'Failed to process payment',
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
        message: error.message || 'Failed to process payment. Please try again.'
      })
    };
  }
};
