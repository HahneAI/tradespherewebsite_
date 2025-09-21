const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
const crypto = require('crypto');

// Input validation schema
const companySchema = z.object({
  paymentId: z.string(),
  companyEmail: z.string().email(),
  companyName: z.string().min(2),
  dwollaCustomerId: z.string(),
  accountHolderName: z.string().min(2)
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Generate secure temporary password
function generateTemporaryPassword() {
  return crypto.randomBytes(12).toString('base64').slice(0, 16);
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
    // Parse and validate input
    const body = JSON.parse(event.body);
    const validatedData = companySchema.parse(body);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Verify payment exists and is successful
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', validatedData.paymentId)
      .eq('status', 'processed')
      .single();

    if (paymentError || !paymentData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Payment verification failed',
          message: 'Payment not found or not completed'
        })
      };
    }

    // Check if company already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('email', validatedData.companyEmail)
      .single();

    if (existingCompany) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Company already exists',
          message: 'A company with this email already exists'
        })
      };
    }

    // Create company record
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: validatedData.companyName,
        email: validatedData.companyEmail,
        dwolla_customer_id: validatedData.dwollaCustomerId,
        payment_id: validatedData.paymentId,
        status: 'active',
        subscription_status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (companyError) {
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    // Generate temporary password for owner
    const temporaryPassword = generateTemporaryPassword();

    // Create Supabase Auth user for company owner
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: validatedData.companyEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        company_id: company.id,
        company_name: validatedData.companyName,
        role: 'owner',
        full_name: validatedData.accountHolderName
      }
    });

    if (authError) {
      // Rollback company creation
      await supabase.from('companies').delete().eq('id', company.id);
      throw new Error(`Failed to create user account: ${authError.message}`);
    }

    // Create user record in users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        company_id: company.id,
        email: validatedData.companyEmail,
        full_name: validatedData.accountHolderName,
        role: 'owner',
        status: 'active',
        created_at: new Date().toISOString()
      });

    if (userError) {
      // Rollback auth user and company creation
      await supabase.auth.admin.deleteUser(authUser.user.id);
      await supabase.from('companies').delete().eq('id', company.id);
      throw new Error(`Failed to create user record: ${userError.message}`);
    }

    // Update payment record with company ID
    await supabase
      .from('payments')
      .update({ company_id: company.id })
      .eq('id', validatedData.paymentId);

    // TODO: Send welcome email with login credentials
    // This would typically integrate with an email service like SendGrid, Mailgun, etc.
    console.log(`Welcome email should be sent to ${validatedData.companyEmail} with temporary password: ${temporaryPassword}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        companyId: company.id,
        userId: authUser.user.id,
        loginCredentials: {
          email: validatedData.companyEmail,
          temporaryPassword: temporaryPassword
        },
        message: 'Company and user account created successfully',
        nextSteps: [
          'Check your email for login instructions',
          'Log in with the provided temporary password',
          'Complete your company profile setup',
          'Start using Trade-Sphere AI pricing tools'
        ]
      })
    };

  } catch (error) {
    console.error('Error creating company:', error);

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

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'Failed to create company'
      })
    };
  }
};