const { Client } = require('dwolla-v2');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

// Input validation schema
const paymentSchema = z.object({
  customerId: z.string(),
  customerFundingSourceUrl: z.string().url(),
  amount: z.number().min(2000).max(2000), // Enforce $2000 payment
  companyEmail: z.string().email(),
  companyName: z.string().min(2)
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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
    const validatedData = paymentSchema.parse(body);

    // Initialize clients
    const dwolla = new Client({
      key: process.env.DWOLLA_APP_KEY,
      secret: process.env.DWOLLA_APP_SECRET,
      environment: process.env.DWOLLA_ENVIRONMENT || 'sandbox'
    });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Create payment record in database first
    const { data: paymentRecord, error: dbError } = await supabase
      .from('payments')
      .insert({
        company_email: validatedData.companyEmail,
        company_name: validatedData.companyName,
        dwolla_customer_id: validatedData.customerId,
        amount: validatedData.amount,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Create ACH transfer request
    const transferRequest = {
      _links: {
        source: {
          href: validatedData.customerFundingSourceUrl
        },
        destination: {
          href: process.env.COMPANY_FUNDING_SOURCE_URL // Trade-Sphere's funding source
        }
      },
      amount: {
        currency: 'USD',
        value: validatedData.amount.toFixed(2)
      },
      metadata: {
        paymentId: paymentRecord.id,
        companyEmail: validatedData.companyEmail,
        companyName: validatedData.companyName
      }
    };

    // Initiate transfer
    const transferResponse = await dwolla.post('transfers', transferRequest);
    const transferUrl = transferResponse.headers.get('location');
    const transferId = transferUrl.split('/').pop();

    // Update payment record with transfer ID
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        dwolla_transfer_id: transferId,
        dwolla_transfer_url: transferUrl,
        status: 'processing'
      })
      .eq('id', paymentRecord.id);

    if (updateError) {
      console.error('Failed to update payment record:', updateError);
    }

    // Get transfer status
    const transferDetails = await dwolla.get(transferUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentId: paymentRecord.id,
        transferId,
        transferUrl,
        status: transferDetails.body.status,
        amount: validatedData.amount,
        message: 'Payment initiated successfully. Processing may take 3-5 business days.'
      })
    };

  } catch (error) {
    console.error('Error processing payment:', error);

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

    // Handle Dwolla API errors
    if (error.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Payment processing error',
          message: error.body.message || 'Failed to process payment',
          details: error.body._embedded?.errors || []
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process payment'
      })
    };
  }
};