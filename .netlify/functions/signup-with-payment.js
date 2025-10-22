/**
 * STRIPE + PLAID SIGNUP WITH PAYMENT FLOW
 *
 * Unified Netlify function for complete user signup and first payment processing.
 * Replaces the old Dwolla 3-step process (create-customer → process-payment → create-company)
 * with a streamlined Stripe + Plaid flow.
 *
 * FLOW:
 * 1. Frontend collects company info and uses Plaid Link for instant bank verification
 * 2. Frontend sends public_token from Plaid + company details to this endpoint
 * 3. Backend exchanges public_token for processor_token
 * 4. Backend creates Stripe customer
 * 5. Backend attaches payment method to customer using processor_token
 * 6. Backend processes first payment ($2000 initial subscription)
 * 7. Backend creates payment record (webhook will handle company creation)
 *
 * @see DATABASE-MIGRATION-VALIDATION.md
 * @see STRIPE-PLAID-ARCHITECTURE.md
 */

const { z } = require('zod');
const Stripe = require('stripe');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { createClient } = require('@supabase/supabase-js');

// Input validation schema
const signupSchema = z.object({
  // Company information
  companyName: z.string().min(2).max(100),
  companyEmail: z.string().email(),
  ownerName: z.string().min(2).max(100),
  phone: z.string().optional(),

  // Plaid tokens
  plaidPublicToken: z.string().min(1),
  plaidAccountId: z.string().min(1),

  // Payment details
  subscriptionTier: z.enum(['starter', 'growth', 'enterprise']).default('growth'),

  // Optional metadata
  metadata: z.record(z.string()).optional()
});

// Subscription pricing (in dollars)
const SUBSCRIPTION_PRICING = {
  starter: 99.00,
  growth: 299.00,
  enterprise: 2000.00 // Custom pricing, default high
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
    const validatedData = signupSchema.parse(body);

    // Initialize clients
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia'
    });

    const plaidConfig = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });
    const plaid = new PlaidApi(plaidConfig);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Calculate subscription amount
    const subscriptionAmount = SUBSCRIPTION_PRICING[validatedData.subscriptionTier];
    const amountInCents = dollarsToCents(subscriptionAmount);

    console.log(`Processing signup for ${validatedData.companyEmail} - ${validatedData.subscriptionTier} tier ($${subscriptionAmount})`);

    // STEP 1: Exchange Plaid public token for access token
    console.log('Step 1: Exchanging Plaid public token...');
    const exchangeResponse = await plaid.itemPublicTokenExchange({
      public_token: validatedData.plaidPublicToken,
    });
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // STEP 2: Create Stripe processor token from Plaid
    console.log('Step 2: Creating Stripe processor token...');
    const processorTokenResponse = await plaid.processorStripeBankAccountTokenCreate({
      access_token: accessToken,
      account_id: validatedData.plaidAccountId,
    });
    const processorToken = processorTokenResponse.data.stripe_bank_account_token;

    // STEP 3: Get bank account details for record keeping
    console.log('Step 3: Fetching bank account details...');
    const accountsResponse = await plaid.accountsGet({
      access_token: accessToken,
    });
    const bankAccount = accountsResponse.data.accounts.find(
      acc => acc.account_id === validatedData.plaidAccountId
    );
    const bankName = bankAccount?.name || 'Bank Account';
    const bankLast4 = bankAccount?.mask || '****';

    // STEP 4: Create Stripe customer
    console.log('Step 4: Creating Stripe customer...');
    const customer = await stripe.customers.create({
      email: validatedData.companyEmail,
      name: validatedData.companyName,
      description: `${validatedData.companyName} - ${validatedData.subscriptionTier} tier`,
      phone: validatedData.phone,
      metadata: {
        company_name: validatedData.companyName,
        owner_name: validatedData.ownerName,
        subscription_tier: validatedData.subscriptionTier,
        plaid_item_id: itemId,
        ...validatedData.metadata
      }
    });

    console.log(`Stripe customer created: ${customer.id}`);

    // STEP 5: Create payment method from processor token
    console.log('Step 5: Creating Stripe payment method...');
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: {
        account_holder_type: 'company',
        token: processorToken,
      },
    });

    console.log(`Payment method created: ${paymentMethod.id}`);

    // STEP 6: Attach payment method to customer
    console.log('Step 6: Attaching payment method to customer...');
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    // STEP 7: Create payment record BEFORE processing payment
    console.log('Step 7: Creating payment record in database...');
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert({
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

    // STEP 8: Create payment intent for first payment
    console.log('Step 8: Creating Stripe payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: customer.id,
      payment_method: paymentMethod.id,
      payment_method_types: ['us_bank_account'],
      confirm: true, // Immediately confirm the payment
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'] || '0.0.0.0',
            user_agent: event.headers['user-agent'] || 'Unknown',
          },
        },
      },
      description: `${validatedData.companyName} - Initial ${validatedData.subscriptionTier} subscription`,
      metadata: {
        company_email: validatedData.companyEmail,
        company_name: validatedData.companyName,
        owner_name: validatedData.ownerName,
        subscription_tier: validatedData.subscriptionTier,
        payment_id: payment.id,
        type: 'initial_subscription'
      }
    });

    console.log(`Payment intent created: ${paymentIntent.id} (status: ${paymentIntent.status})`);

    // STEP 9: Update payment record with Stripe IDs
    console.log('Step 9: Updating payment record with Stripe IDs...');
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

    // STEP 10: If payment succeeded immediately, create company record
    // (Usually ACH payments are async, but in some cases they can succeed immediately)
    let companyCreated = false;
    let companyId = null;
    let userId = null;

    if (paymentIntent.status === 'succeeded') {
      console.log('Step 10: Payment succeeded immediately, creating company...');

      try {
        const createCompanyUrl = `${process.env.FRONTEND_URL}/.netlify/functions/create-company`;
        const companyResponse = await fetch(createCompanyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: payment.id,
            companyEmail: validatedData.companyEmail,
            companyName: validatedData.companyName,
            stripeCustomerId: customer.id,
            stripePaymentMethodId: paymentMethod.id,
            ownerName: validatedData.ownerName,
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
        customerId: customer.id,
        paymentMethodId: paymentMethod.id,
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
    console.error('Error in signup-with-payment:', error);

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

    // Handle Plaid errors
    if (error.response?.data?.error_code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bank verification failed',
          message: error.response.data.error_message || 'Failed to verify bank account',
          code: error.response.data.error_code,
          details: error.response.data
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
        message: 'Failed to process signup and payment. Please try again.'
      })
    };
  }
};
