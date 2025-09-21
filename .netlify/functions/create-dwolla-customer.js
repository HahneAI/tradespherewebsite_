const { Client } = require('dwolla-v2');
const { z } = require('zod');

// Input validation schema
const customerSchema = z.object({
  companyEmail: z.string().email(),
  companyName: z.string().min(2),
  routingNumber: z.string().length(9),
  accountNumber: z.string().min(4).max(17),
  accountType: z.enum(['checking', 'savings']),
  accountHolderName: z.string().min(2)
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
    const validatedData = customerSchema.parse(body);

    // Initialize Dwolla client
    const dwolla = new Client({
      key: process.env.DWOLLA_APP_KEY,
      secret: process.env.DWOLLA_APP_SECRET,
      environment: process.env.DWOLLA_ENVIRONMENT || 'sandbox'
    });

    // Create business customer
    const customerRequest = {
      firstName: validatedData.accountHolderName.split(' ')[0] || validatedData.accountHolderName,
      lastName: validatedData.accountHolderName.split(' ').slice(1).join(' ') || 'Company',
      email: validatedData.companyEmail,
      type: 'business',
      businessName: validatedData.companyName,
      businessType: 'corporation',
      businessClassification: '9ed3f670-7d6f-11e3-b1ce-5404a6144203', // Software
      ein: '12-3456789', // This should be collected in the form or generated
      address1: '123 Business St', // This should be collected in the form
      city: 'Des Moines',
      state: 'IA',
      postalCode: '50309',
      country: 'US',
      phone: '+15555551234' // This should be collected in the form
    };

    const customerResponse = await dwolla.post('customers', customerRequest);
    const customerUrl = customerResponse.headers.get('location');
    const customerId = customerUrl.split('/').pop();

    // Create funding source (bank account)
    const fundingSourceRequest = {
      routingNumber: validatedData.routingNumber,
      accountNumber: validatedData.accountNumber,
      bankAccountType: validatedData.accountType,
      name: `${validatedData.companyName} - ${validatedData.accountType.charAt(0).toUpperCase() + validatedData.accountType.slice(1)}`
    };

    const fundingSourceResponse = await dwolla.post(`${customerUrl}/funding-sources`, fundingSourceRequest);
    const fundingSourceUrl = fundingSourceResponse.headers.get('location');

    // Initiate micro-deposit verification
    try {
      await dwolla.post(`${fundingSourceUrl}/micro-deposits`);
    } catch (error) {
      console.log('Micro-deposits may already be initiated or not needed:', error.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customerId,
        customerUrl,
        fundingSourceUrl,
        verificationStatus: 'pending',
        message: 'Customer created successfully. Micro-deposits will be sent for verification.'
      })
    };

  } catch (error) {
    console.error('Error creating Dwolla customer:', error);

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
          error: 'Dwolla API error',
          message: error.body.message || 'Failed to create customer',
          details: error.body._embedded?.errors || []
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to create customer'
      })
    };
  }
};