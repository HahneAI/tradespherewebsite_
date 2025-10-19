/**
 * SIGNUP WITH PAYMENT - Complete owner registration flow
 *
 * This Netlify function handles the complete owner signup process including:
 * 1. Input validation
 * 2. Dwolla customer creation
 * 3. Bank account setup
 * 4. Micro-deposit initiation
 * 5. Supabase Auth user creation
 * 6. Company and user record creation
 * 7. Welcome email sending
 *
 * CRITICAL: The companies table HAS an owner_id column (uuid, nullable).
 * This links the company directly to its owner's Auth user ID for quick lookups.
 */

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import DwollaService from '../../src/services/DwollaService';
import type {
  CreateCustomerParams,
  CreateFundingSourceParams,
  BusinessType,
  FundingSourceType
} from '../../src/types/payment';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Environment variables
const APP_URL = process.env.APP_URL || 'https://app.tradesphere.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@tradesphere.com';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// Plan pricing in dollars (stored as numeric in DB)
const PLAN_PRICING = {
  standard: 2000.00,  // $2000/month
  pro: 3500.00,       // $3500/month
  enterprise: 5000.00 // $5000/month
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Routing number validation regex (exactly 9 digits)
const ROUTING_NUMBER_REGEX = /^\d{9}$/;

/**
 * Request body interface for signup
 */
interface SignupRequest {
  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  password: string;

  // Company info
  companyName: string;
  industry?: string;
  businessType?: BusinessType;

  // Bank account info
  routingNumber: string;
  accountNumber: string;
  bankAccountType: FundingSourceType;
  bankAccountName?: string;

  // Plan selection
  selectedPlan: 'standard' | 'pro' | 'enterprise';

  // Legal checkboxes
  agreeToTerms: boolean;
  authorizePayments: boolean;
}

/**
 * Send welcome email to new owner
 */
async function sendWelcomeEmail(
  email: string,
  firstName: string,
  companyName: string,
  trialEndDate: string,
  sessionToken?: string
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.log('SendGrid not configured - skipping welcome email');
    console.log(`Would send welcome email to ${email} with onboarding link`);
    return;
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(SENDGRID_API_KEY);

    const onboardingUrl = sessionToken
      ? `${APP_URL}/onboarding?token=${encodeURIComponent(sessionToken)}`
      : `${APP_URL}/login`;

    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: `Welcome to TradeSphere, ${firstName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to TradeSphere!</h2>

          <p>Hi ${firstName},</p>

          <p>Thank you for signing up ${companyName} with TradeSphere. Your account has been successfully created!</p>

          <h3>What's Next?</h3>

          <p><strong>Complete Your Onboarding:</strong></p>
          <p>
            <a href="${onboardingUrl}"
               style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px;">
              Complete Setup
            </a>
          </p>

          <h3>Your Trial Period</h3>
          <ul>
            <li>30-day free trial active until ${new Date(trialEndDate).toLocaleDateString()}</li>
            <li>Full access to all features in your selected plan</li>
            <li>No charges during the trial period</li>
          </ul>

          <h3>Bank Account Verification</h3>
          <p>We've initiated micro-deposits to verify your bank account. Here's what to expect:</p>
          <ul>
            <li>Two small deposits (less than $0.10 each) will appear in 1-3 business days</li>
            <li>You'll need to verify these amounts in your dashboard</li>
            <li>Once verified, your payment method will be ready for automatic billing after the trial</li>
          </ul>

          <h3>Need Help?</h3>
          <p>Our support team is here to help you get started:</p>
          <ul>
            <li>Email: support@tradesphere.com</li>
            <li>Knowledge Base: ${APP_URL}/help</li>
            <li>Schedule a Demo: ${APP_URL}/schedule-demo</li>
          </ul>

          <p>Best regards,<br>The TradeSphere Team</p>

          <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            TradeSphere - Comprehensive Business Management Platform<br>
            This email was sent to ${email} because you signed up for a TradeSphere account.
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Welcome email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Non-fatal - continue with signup
  }
}

/**
 * Validate all required signup fields
 */
function validateSignupRequest(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.firstName?.trim()) errors.push('First name is required');
  if (!data.lastName?.trim()) errors.push('Last name is required');
  if (!data.email?.trim()) errors.push('Email is required');
  if (!data.password) errors.push('Password is required');
  if (!data.companyName?.trim()) errors.push('Company name is required');
  if (!data.routingNumber) errors.push('Routing number is required');
  if (!data.accountNumber) errors.push('Account number is required');
  if (!data.bankAccountType) errors.push('Bank account type is required');
  if (!data.selectedPlan) errors.push('Plan selection is required');

  // Email validation
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.push('Invalid email format');
  }

  // Password validation (min 8 chars)
  if (data.password && data.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Routing number validation (exactly 9 digits)
  if (data.routingNumber && !ROUTING_NUMBER_REGEX.test(data.routingNumber)) {
    errors.push('Routing number must be exactly 9 digits');
  }

  // Bank account type validation
  if (data.bankAccountType && !['checking', 'savings'].includes(data.bankAccountType)) {
    errors.push('Bank account type must be checking or savings');
  }

  // Plan validation
  if (data.selectedPlan && !['standard', 'pro', 'enterprise'].includes(data.selectedPlan)) {
    errors.push('Invalid plan selection');
  }

  // Legal checkboxes
  if (!data.agreeToTerms) {
    errors.push('You must agree to the terms and conditions');
  }
  if (!data.authorizePayments) {
    errors.push('You must authorize payment processing');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Main handler function
 */
export const handler: Handler = async (event) => {
  console.log('=== SIGNUP WITH PAYMENT HANDLER START ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', event.headers);

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Variables to track created resources for potential rollback
  let authUserId: string | null = null;
  let companyId: string | null = null;

  try {
    // Parse request body
    const data: SignupRequest = JSON.parse(event.body || '{}');
    console.log('Signup request for:', data.email, '- Company:', data.companyName);

    // =========================================================================
    // STEP 1: Input Validation
    // =========================================================================
    console.log('Step 1: Validating input...');
    const validation = validateSignupRequest(data);
    if (!validation.valid) {
      console.error('Validation failed:', validation.errors);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Validation failed',
          details: validation.errors.join('. ')
        })
      };
    }

    // Check if email already exists in Supabase Auth
    console.log('Checking if email already exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (!listError && existingUsers?.users) {
      const emailExists = existingUsers.users.some(user => user.email === data.email);
      if (emailExists) {
        console.error('Email already registered:', data.email);
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Email already registered',
            details: 'An account with this email already exists. Please sign in or use a different email.'
          })
        };
      }
    }

    // =========================================================================
    // STEP 2: Create Dwolla Customer
    // =========================================================================
    console.log('Step 2: Creating Dwolla customer...');
    let customerUrl: string;
    let customerId: string;

    try {
      const dwolla = DwollaService.getInstance();
      const customerParams: CreateCustomerParams = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        companyName: data.companyName,
        businessType: data.businessType
      };

      const customerResponse = await dwolla.createCustomer(customerParams);

      if (!customerResponse.success || !customerResponse.data) {
        throw new Error(customerResponse.error?.message || 'Failed to create Dwolla customer');
      }

      customerUrl = customerResponse.data.customerUrl;
      customerId = customerResponse.data.customerId;
      console.log('Dwolla customer created:', customerId);
      console.log('Customer URL:', customerUrl);
    } catch (error) {
      console.error('Dwolla customer creation failed:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Payment setup failed',
          details: 'Unable to create payment account. Please try again or contact support.'
        })
      };
    }

    // =========================================================================
    // STEP 3: Add Bank Account (Funding Source)
    // =========================================================================
    console.log('Step 3: Adding bank account...');
    let fundingSourceUrl: string;
    let fundingSourceId: string;

    try {
      const dwolla = DwollaService.getInstance();
      const fundingParams: CreateFundingSourceParams = {
        customerUrl,
        routingNumber: data.routingNumber,
        accountNumber: data.accountNumber,
        bankAccountType: data.bankAccountType,
        name: data.bankAccountName || `${data.companyName} Bank Account`
      };

      const fundingResponse = await dwolla.createFundingSource(fundingParams);

      if (!fundingResponse.success || !fundingResponse.data) {
        throw new Error(fundingResponse.error?.message || 'Failed to add bank account');
      }

      fundingSourceUrl = fundingResponse.data.fundingSourceUrl;
      fundingSourceId = fundingResponse.data.fundingSourceId;
      console.log('Bank account added:', fundingSourceId);
    } catch (error) {
      console.error('Bank account creation failed:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Bank account setup failed',
          details: 'Unable to add bank account. Please verify your routing and account numbers.'
        })
      };
    }

    // =========================================================================
    // STEP 4: Initiate Micro-Deposits (NON-FATAL)
    // =========================================================================
    console.log('Step 4: Initiating micro-deposits...');
    try {
      const dwolla = DwollaService.getInstance();
      const microDepositResponse = await dwolla.initiateMicroDeposits(fundingSourceUrl);

      if (microDepositResponse.success) {
        console.log('Micro-deposits initiated successfully');
      } else {
        console.warn('Micro-deposits failed (non-fatal):', microDepositResponse.error);
      }
    } catch (error) {
      console.error('Micro-deposit initiation failed (non-fatal):', error);
      // Continue - micro-deposits can be retried later
    }

    // =========================================================================
    // STEP 5: Create Supabase Auth User
    // =========================================================================
    console.log('Step 5: Creating Supabase Auth user...');
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`
        }
      });

      if (authError || !authUser?.user) {
        throw authError || new Error('Failed to create auth user');
      }

      authUserId = authUser.user.id;
      console.log('Auth user created:', authUserId);
    } catch (error) {
      console.error('Auth user creation failed:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Account creation failed',
          details: 'Unable to create user account. Please try again.'
        })
      };
    }

    // =========================================================================
    // STEP 6: Create Company Record
    // =========================================================================
    console.log('Step 6: Creating company record...');
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 30);
    const nextBillingDate = new Date(now);
    nextBillingDate.setDate(nextBillingDate.getDate() + 31);

    try {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: data.companyName,
          owner_id: authUserId,  // Link owner to company
          email: data.email,
          industry: data.industry || null,
          subscription_status: 'trial',
          subscription_tier: data.selectedPlan,
          trial_end_date: trialEndDate.toISOString().split('T')[0],
          next_billing_date: nextBillingDate.toISOString().split('T')[0],
          monthly_amount: PLAN_PRICING[data.selectedPlan],
          dwolla_customer_url: customerUrl,
          dwolla_funding_source_id: fundingSourceId,
          payment_method_status: 'pending',
          billing_email: data.email,
          billing_name: `${data.firstName} ${data.lastName}`,
          billing_cycle_day: nextBillingDate.getDate(),
          payment_failure_count: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .select()
        .single();

      if (companyError || !company) {
        throw companyError || new Error('Failed to create company record');
      }

      companyId = company.id;
      console.log('Company created with UUID:', companyId, '- Generated company_id:', company.company_id, '- Owner ID set to:', authUserId);
    } catch (error) {
      console.error('Company creation failed:', error);

      // Rollback: Delete the auth user since company creation failed
      console.log('Rolling back: Deleting auth user...');
      try {
        await supabase.auth.admin.deleteUser(authUserId);
        console.log('Auth user rolled back successfully');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Company setup failed',
          details: 'Unable to create company account. Please try again.'
        })
      };
    }

    // =========================================================================
    // STEP 7: Create User Record (Owner)
    // =========================================================================
    console.log('Step 7: Creating user record (owner)...');
    try {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          company_id: companyId,
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
          role: 'owner',
          is_owner: true,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        });

      if (userError) {
        // Log error but don't fail signup - user can be created manually later
        console.error('User record creation failed (non-fatal):', userError);
      } else {
        console.log('User record created successfully');
      }
    } catch (error) {
      console.error('User record creation error (non-fatal):', error);
      // Continue - auth user and company exist, user record can be fixed manually
    }

    // =========================================================================
    // STEP 8: Generate Session Token
    // =========================================================================
    console.log('Step 8: Generating session token...');
    let sessionToken: string | undefined;
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: data.email
      });

      if (linkData?.properties?.action_link) {
        // Extract token from the action link
        const url = new URL(linkData.properties.action_link);
        sessionToken = url.searchParams.get('token') || undefined;
        console.log('Session token generated');
      } else {
        console.warn('Failed to generate session token:', linkError);
      }
    } catch (error) {
      console.error('Session token generation failed (non-fatal):', error);
      // Continue - user can log in manually
    }

    // =========================================================================
    // STEP 9: Send Welcome Email (NON-FATAL)
    // =========================================================================
    console.log('Step 9: Sending welcome email...');
    await sendWelcomeEmail(
      data.email,
      data.firstName,
      data.companyName,
      trialEndDate.toISOString().split('T')[0],
      sessionToken
    );

    // =========================================================================
    // SUCCESS RESPONSE
    // =========================================================================
    console.log('=== SIGNUP COMPLETED SUCCESSFULLY ===');
    console.log('User ID:', authUserId);
    console.log('Company ID:', companyId);
    console.log('Dwolla Customer ID:', customerId);
    console.log('Trial ends:', trialEndDate.toISOString().split('T')[0]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Signup completed successfully! Check your email for next steps.',
        data: {
          userId: authUserId,
          companyId,
          email: data.email,
          trialEndDate: trialEndDate.toISOString().split('T')[0],
          sessionToken: sessionToken || null
        }
      })
    };

  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN SIGNUP HANDLER ===');
    console.error(error);

    // Attempt rollback if we have created resources
    if (authUserId) {
      console.log('Attempting to rollback auth user...');
      try {
        await supabase.auth.admin.deleteUser(authUserId);
        console.log('Auth user rolled back');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Signup failed',
        details: 'An unexpected error occurred. Please try again or contact support.'
      })
    };
  }
};