const { createClient } = require('@supabase/supabase-js');
const { Client } = require('dwolla-v2');
const crypto = require('crypto');

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Dwolla-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Verify Dwolla webhook signature
function verifySignature(body, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return `sha256=${hash}` === signature;
}

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
    // Verify webhook signature
    const signature = event.headers['x-dwolla-signature'];
    const webhookSecret = process.env.DWOLLA_WEBHOOK_SECRET;

    if (!webhookSecret || !signature) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - missing signature' })
      };
    }

    if (!verifySignature(event.body, signature, webhookSecret)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - invalid signature' })
      };
    }

    // Parse webhook payload
    const payload = JSON.parse(event.body);
    const { topic, _links } = payload;

    console.log(`Received Dwolla webhook: ${topic}`);

    // Initialize clients
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const dwolla = new Client({
      key: process.env.DWOLLA_APP_KEY,
      secret: process.env.DWOLLA_APP_SECRET,
      environment: process.env.DWOLLA_ENVIRONMENT || 'sandbox'
    });

    // Handle different webhook events
    switch (topic) {
      case 'transfer_completed':
        await handleTransferCompleted(_links, supabase, dwolla);
        break;

      case 'transfer_failed':
        await handleTransferFailed(_links, supabase, dwolla);
        break;

      case 'transfer_cancelled':
        await handleTransferCancelled(_links, supabase, dwolla);
        break;

      case 'customer_funding_source_verified':
        await handleFundingSourceVerified(_links, supabase);
        break;

      case 'customer_funding_source_negative':
        await handleFundingSourceNegative(_links, supabase);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, processed: topic })
    };

  } catch (error) {
    console.error('Error processing webhook:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process webhook'
      })
    };
  }
};

// Handle successful transfer completion
async function handleTransferCompleted(links, supabase, dwolla) {
  try {
    const transferUrl = links.transfer.href;
    const transferId = transferUrl.split('/').pop();

    // Get transfer details
    const transferResponse = await dwolla.get(transferUrl);
    const transfer = transferResponse.body;

    // Update payment status
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('dwolla_transfer_id', transferId)
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to update payment status:', paymentError);
      return;
    }

    if (!payment) {
      console.log('Payment not found for transfer:', transferId);
      return;
    }

    // Trigger company creation
    const companyPayload = {
      paymentId: payment.id,
      companyEmail: payment.company_email,
      companyName: payment.company_name,
      dwollaCustomerId: payment.dwolla_customer_id,
      accountHolderName: transfer.metadata?.accountHolderName || 'Company Owner'
    };

    // Call create-company function
    const createCompanyUrl = `${process.env.FRONTEND_URL}/.netlify/functions/create-company`;
    const response = await fetch(createCompanyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyPayload)
    });

    if (!response.ok) {
      console.error('Failed to create company:', await response.text());
    } else {
      console.log('Company creation triggered successfully');
    }

  } catch (error) {
    console.error('Error handling transfer completion:', error);
  }
}

// Handle failed transfer
async function handleTransferFailed(links, supabase, dwolla) {
  try {
    const transferUrl = links.transfer.href;
    const transferId = transferUrl.split('/').pop();

    // Get transfer details and failure reason
    const transferResponse = await dwolla.get(transferUrl);
    const transfer = transferResponse.body;

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: transfer.failureReason || 'Unknown error',
        failed_at: new Date().toISOString()
      })
      .eq('dwolla_transfer_id', transferId);

    console.log(`Transfer ${transferId} failed: ${transfer.failureReason}`);

  } catch (error) {
    console.error('Error handling transfer failure:', error);
  }
}

// Handle cancelled transfer
async function handleTransferCancelled(links, supabase, dwolla) {
  try {
    const transferUrl = links.transfer.href;
    const transferId = transferUrl.split('/').pop();

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('dwolla_transfer_id', transferId);

    console.log(`Transfer ${transferId} was cancelled`);

  } catch (error) {
    console.error('Error handling transfer cancellation:', error);
  }
}

// Handle funding source verification
async function handleFundingSourceVerified(links, supabase) {
  try {
    const fundingSourceUrl = links['funding_source'].href;

    // Update any related payment records
    console.log(`Funding source verified: ${fundingSourceUrl}`);

    // You might want to update customer records or notify users here

  } catch (error) {
    console.error('Error handling funding source verification:', error);
  }
}

// Handle negative funding source status
async function handleFundingSourceNegative(links, supabase) {
  try {
    const fundingSourceUrl = links['funding_source'].href;

    console.log(`Funding source failed verification: ${fundingSourceUrl}`);

    // Handle verification failure - might need to pause payments or notify customer

  } catch (error) {
    console.error('Error handling funding source negative status:', error);
  }
}