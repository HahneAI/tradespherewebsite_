# PHASE 4C: WEBSITE TASKS - OWNER REGISTRATION WITH PAYMENT

> **Status**: Ready for implementation
> **Repository**: tradesphere-website (separate repo)
> **Coordination**: Works with tradesphere-no-code-migration app repo
> **Timeline**: Implement in parallel with app-side Phase 4C

---

## Overview

The **website** handles the initial owner registration flow where business owners sign up for TradeSphere and provide payment information. This is the entry point for new companies before they access the main app.

### Website Responsibilities

1. ✅ Display pricing plans and features
2. ✅ Collect owner information (name, email, password)
3. ✅ Collect company information (business name, industry)
4. ✅ Collect bank account information for ACH payments
5. ✅ Create Dwolla customer and funding source
6. ✅ Initiate micro-deposit verification
7. ✅ Create company record in Supabase
8. ✅ Create owner user in Supabase Auth
9. ✅ Send welcome email with link to app onboarding

### What Website Does NOT Handle

- ❌ Micro-deposit verification (handled in app later)
- ❌ Team member invitations (app-side)
- ❌ Subscription management (app-side)
- ❌ Webhook processing (app-side Netlify function)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBSITE (Owner Signup)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Owner fills out registration form:                          │
│     - Name, email, password                                      │
│     - Company name, industry                                     │
│     - Bank account (routing, account number, type)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Website Netlify Function: signup-with-payment.ts             │
│     - Validates all inputs                                       │
│     - Creates Dwolla customer (business)                         │
│     - Adds bank account as funding source                        │
│     - Initiates micro-deposits ($0.01, $0.05)                   │
│     - Creates Supabase Auth user                                 │
│     - Creates company record (subscription_status: 'trial')      │
│     - Stores dwolla_customer_url, dwolla_funding_source_id       │
│     - Generates session token for app auto-login                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Email sent to owner:                                         │
│     Subject: "Welcome to TradeSphere - Complete Setup"           │
│     Body: Link to app with session token                         │
│     https://app.tradesphere.com/onboarding?token=SESSION_TOKEN   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APP (Separate Repo)                          │
│  - Auto-authenticates with session token                         │
│  - Shows onboarding wizard (AI setup, team invites)              │
│  - Later: Micro-deposit verification                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Install Dependencies

```bash
npm install dwolla-v2
npm install @supabase/supabase-js  # If not already installed
```

**Files to modify**: `package.json`

---

### Task 2: Copy DwollaService.ts from App Repo

**Source**: `tradesphere-no-code-migration/src/services/DwollaService.ts`
**Destination**: `src/services/DwollaService.ts` (website repo)

**Why**: The website needs the same Dwolla API wrapper to create customers and funding sources.

**Note**: This is a **server-side only** service. It must NEVER be imported in browser-side React components. Only use in Netlify functions.

---

### Task 3: Copy Payment Types from App Repo

**Source**: `tradesphere-no-code-migration/src/types/payment.ts`
**Destination**: `src/types/payment.ts` (website repo)

**Why**: TypeScript type safety for Dwolla API calls and responses.

---

### Task 4: Add Environment Variables

**File**: `.env` (local development) and Netlify dashboard (production)

```env
# ==============================================================================
# DWOLLA PAYMENT GATEWAY (Server-side only - NEVER prefix with VITE_)
# ==============================================================================

# Dwolla API credentials (get from https://dashboard.dwolla.com/)
DWOLLA_APP_KEY=your-dwolla-app-key
DWOLLA_APP_SECRET=your-dwolla-app-secret

# Environment: 'sandbox' for testing, 'production' for live payments
DWOLLA_ENVIRONMENT=sandbox

# TradeSphere's master funding source (where customer payments go)
# This is YOUR company's bank account URL in Dwolla
DWOLLA_MASTER_FUNDING_SOURCE_URL=https://api-sandbox.dwolla.com/funding-sources/YOUR-TRADESPHERE-BANK-ID

# Supabase database connection (shared with app)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email service (for welcome emails)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@tradesphere.com

# App URL (for onboarding link in email)
APP_URL=https://app.tradesphere.com
```

**Security Notes**:
- ⚠️ **NEVER** prefix Dwolla credentials with `VITE_` (exposes to browser)
- ✅ Use `SUPABASE_SERVICE_ROLE_KEY` (not anon key) for server-side operations
- ✅ Store credentials in Netlify environment variables dashboard for production

---

### Task 5: Create Registration Form Component

**File**: `src/components/OwnerRegistrationForm.tsx` (NEW)

**UI Requirements**:

1. **Step 1: Account Information**
   - First Name (text input)
   - Last Name (text input)
   - Email (email input with validation)
   - Password (password input, min 8 chars)
   - Confirm Password (must match)

2. **Step 2: Company Information**
   - Company Name (text input)
   - Industry (dropdown: Landscaping, HVAC, Plumbing, General Contractor, Other)
   - Business Type (dropdown: LLC, Corporation, Sole Proprietorship, Partnership)

3. **Step 3: Bank Account Information**
   - Bank Account Holder Name (text input)
   - Routing Number (9-digit input with validation)
   - Account Number (text input)
   - Account Type (dropdown: Checking, Savings)

4. **Step 4: Plan Selection**
   - Standard Plan: $2000/month (radio button, default selected)
   - Pro Plan: $3500/month (radio button)
   - Enterprise Plan: $5000/month (radio button)

5. **Legal Agreements**
   - ☐ I agree to the Terms of Service (checkbox, required)
   - ☐ I authorize ACH payments from the bank account provided (checkbox, required)

**Validation Rules**:
- All fields required
- Email must be valid format
- Password min 8 characters, must include uppercase, lowercase, number
- Routing number must be exactly 9 digits
- Both checkboxes must be checked to submit

**Example UI Structure**:

```tsx
import React, { useState } from 'react';

interface FormData {
  // Step 1: Account
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Step 2: Company
  companyName: string;
  industry: string;
  businessType: 'llc' | 'corporation' | 'soleProprietorship' | 'partnership';

  // Step 3: Bank Account
  bankAccountName: string;
  routingNumber: string;
  accountNumber: string;
  bankAccountType: 'checking' | 'savings';

  // Step 4: Plan
  selectedPlan: 'standard' | 'pro' | 'enterprise';

  // Legal
  agreeToTerms: boolean;
  authorizePayments: boolean;
}

export default function OwnerRegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    industry: 'landscaping',
    businessType: 'llc',
    bankAccountName: '',
    routingNumber: '',
    accountNumber: '',
    bankAccountType: 'checking',
    selectedPlan: 'standard',
    agreeToTerms: false,
    authorizePayments: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/signup-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Redirect to success page
      window.location.href = '/registration-success';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ... render form steps with validation
}
```

---

### Task 6: Create Netlify Function - signup-with-payment.ts

**File**: `netlify/functions/signup-with-payment.ts` (NEW)

**Purpose**: Server-side handler for owner registration that:
1. Creates Dwolla customer
2. Adds bank account as funding source
3. Initiates micro-deposits
4. Creates Supabase Auth user
5. Creates company record
6. Sends welcome email

**Full Implementation**:

```typescript
/**
 * PHASE 4C: OWNER REGISTRATION WITH PAYMENT
 *
 * Handles new company owner signup with bank account registration.
 * Creates Dwolla customer, funding source, and initiates micro-deposit verification.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import DwollaService from '../../src/services/DwollaService';
import type { FundingSourceType } from '../../src/types/payment';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role for server-side operations
);

const dwolla = DwollaService.getInstance();

export const handler: Handler = async (event: HandlerEvent) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      firstName,
      lastName,
      email,
      password,
      companyName,
      industry,
      businessType,
      bankAccountName,
      routingNumber,
      accountNumber,
      bankAccountType,
      selectedPlan,
      agreeToTerms,
      authorizePayments
    } = JSON.parse(event.body!);

    // ========================================================================
    // STEP 1: VALIDATION
    // ========================================================================

    if (!agreeToTerms || !authorizePayments) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'You must agree to terms and authorize payments' })
      };
    }

    // Validate routing number (9 digits)
    if (!/^\d{9}$/.test(routingNumber)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid routing number. Must be 9 digits.' })
      };
    }

    // Check if email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser.users.some(user => user.email === email);

    if (emailExists) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email already registered' })
      };
    }

    // ========================================================================
    // STEP 2: CREATE DWOLLA CUSTOMER
    // ========================================================================

    console.log('[Signup] Creating Dwolla customer:', { email, companyName });

    const customerResult = await dwolla.createCustomer({
      firstName,
      lastName,
      email,
      companyName,
      businessType
    });

    if (!customerResult.success || !customerResult.data) {
      console.error('[Signup] Failed to create Dwolla customer:', customerResult.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to create payment account',
          details: customerResult.error?.message
        })
      };
    }

    const { customerUrl } = customerResult.data;
    console.log('[Signup] Dwolla customer created:', customerUrl);

    // ========================================================================
    // STEP 3: ADD BANK ACCOUNT (FUNDING SOURCE)
    // ========================================================================

    console.log('[Signup] Adding bank account to Dwolla customer');

    const fundingSourceResult = await dwolla.createFundingSource({
      customerUrl,
      routingNumber,
      accountNumber,
      bankAccountType: bankAccountType as FundingSourceType,
      name: bankAccountName || `${companyName} - ${bankAccountType}`
    });

    if (!fundingSourceResult.success || !fundingSourceResult.data) {
      console.error('[Signup] Failed to add bank account:', fundingSourceResult.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to link bank account',
          details: fundingSourceResult.error?.message
        })
      };
    }

    const { fundingSourceUrl, fundingSourceId } = fundingSourceResult.data;
    console.log('[Signup] Bank account linked:', fundingSourceId);

    // ========================================================================
    // STEP 4: INITIATE MICRO-DEPOSITS
    // ========================================================================

    console.log('[Signup] Initiating micro-deposits for verification');

    const microDepositsResult = await dwolla.initiateMicroDeposits(fundingSourceUrl);

    if (!microDepositsResult.success) {
      console.error('[Signup] Failed to initiate micro-deposits:', microDepositsResult.error);
      // Non-fatal: Continue with signup, user can verify later
    } else {
      console.log('[Signup] Micro-deposits initiated successfully');
    }

    // ========================================================================
    // STEP 5: CREATE SUPABASE AUTH USER
    // ========================================================================

    console.log('[Signup] Creating Supabase Auth user:', email);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Auto-confirm email (or send verification email)
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`
      }
    });

    if (authError || !authData.user) {
      console.error('[Signup] Failed to create auth user:', authError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create user account' })
      };
    }

    const userId = authData.user.id;
    console.log('[Signup] Auth user created:', userId);

    // ========================================================================
    // STEP 6: CREATE COMPANY RECORD
    // ========================================================================

    const planPricing = {
      standard: 2000,
      pro: 3500,
      enterprise: 5000
    };

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);  // 30-day trial

    const nextBillingDate = new Date(trialEndDate);
    nextBillingDate.setDate(nextBillingDate.getDate() + 1);  // Day after trial ends

    console.log('[Signup] Creating company record');

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        email: email,
        industry: industry,
        owner_id: userId,
        subscription_status: 'trial',
        subscription_tier: selectedPlan,
        trial_end_date: trialEndDate.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        monthly_amount: planPricing[selectedPlan as keyof typeof planPricing],
        dwolla_customer_url: customerUrl,
        dwolla_funding_source_id: fundingSourceId,
        payment_method_status: 'pending',  // Pending micro-deposit verification
        billing_email: email,
        billing_name: `${firstName} ${lastName}`,
        billing_cycle_day: nextBillingDate.getDate(),
        payment_failure_count: 0
      })
      .select()
      .single();

    if (companyError || !company) {
      console.error('[Signup] Failed to create company:', companyError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create company record' })
      };
    }

    console.log('[Signup] Company created:', company.id);

    // ========================================================================
    // STEP 7: CREATE USER RECORD (OWNER ROLE)
    // ========================================================================

    console.log('[Signup] Creating user record with owner role');

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        company_id: company.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: 'owner',
        status: 'active',
        permissions: {
          can_manage_pricing: true,
          can_manage_materials: true,
          can_manage_team: true,
          can_manage_billing: true,
          can_view_reports: true
        }
      });

    if (userError) {
      console.error('[Signup] Failed to create user record:', userError);
      // Non-fatal: Auth user exists, they can log in
    }

    // ========================================================================
    // STEP 8: GENERATE SESSION TOKEN FOR APP AUTO-LOGIN
    // ========================================================================

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email
    });

    const sessionToken = sessionData?.properties?.action_link || '';

    // ========================================================================
    // STEP 9: SEND WELCOME EMAIL
    // ========================================================================

    console.log('[Signup] Sending welcome email');

    const appUrl = process.env.APP_URL || 'https://app.tradesphere.com';
    const onboardingUrl = `${appUrl}/onboarding?token=${encodeURIComponent(sessionToken)}`;

    await sendWelcomeEmail({
      email,
      firstName,
      companyName,
      onboardingUrl,
      trialEndDate: trialEndDate.toISOString()
    });

    // ========================================================================
    // SUCCESS RESPONSE
    // ========================================================================

    console.log('[Signup] Registration completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Registration successful! Check your email to complete onboarding.',
        data: {
          userId,
          companyId: company.id,
          email,
          trialEndDate: trialEndDate.toISOString()
        }
      })
    };

  } catch (error: any) {
    console.error('[Signup] Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Registration failed',
        details: error.message
      })
    };
  }
};

/**
 * Send welcome email to new owner
 */
async function sendWelcomeEmail(params: {
  email: string;
  firstName: string;
  companyName: string;
  onboardingUrl: string;
  trialEndDate: string;
}) {
  // TODO: Implement with SendGrid or your email service

  const emailBody = `
    Hi ${params.firstName},

    Welcome to TradeSphere! Your company "${params.companyName}" has been successfully registered.

    Your 30-day trial period is active until ${new Date(params.trialEndDate).toLocaleDateString()}.

    To complete your setup:
    1. Click the link below to access your account
    2. Configure your AI pricing assistant
    3. Invite your team members
    4. Verify your bank account (micro-deposits sent - check your account in 1-3 business days)

    Get Started: ${params.onboardingUrl}

    Questions? Reply to this email or visit our help center.

    - The TradeSphere Team
  `;

  console.log('[Email] Would send welcome email to:', params.email);
  console.log('[Email] Body:', emailBody);

  // Example SendGrid implementation:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: params.email,
  //   from: process.env.FROM_EMAIL,
  //   subject: 'Welcome to TradeSphere - Complete Your Setup',
  //   text: emailBody,
  //   html: emailBody.replace(/\n/g, '<br>')
  // });
}
```

---

### Task 7: Create Success Page

**File**: `src/pages/RegistrationSuccess.tsx` (NEW)

**UI Requirements**:

```tsx
export default function RegistrationSuccess() {
  return (
    <div className="registration-success">
      <h1>✅ Registration Successful!</h1>

      <p>
        Welcome to TradeSphere! We've sent a confirmation email to your inbox
        with a link to complete your onboarding.
      </p>

      <div className="next-steps">
        <h2>What's Next?</h2>

        <ol>
          <li>
            <strong>Check Your Email</strong>
            <p>Click the link in your welcome email to access your account.</p>
          </li>

          <li>
            <strong>Verify Your Bank Account</strong>
            <p>
              We've initiated 2 small deposits (less than $0.10 each) to your bank account.
              These will appear in 1-3 business days. You'll verify these amounts later
              in your account settings to complete payment setup.
            </p>
          </li>

          <li>
            <strong>Complete Onboarding</strong>
            <p>
              Set up your AI pricing assistant, customize your branding, and invite
              your team members.
            </p>
          </li>

          <li>
            <strong>Start Your 30-Day Trial</strong>
            <p>
              Your trial period has started! No charges until your trial ends.
            </p>
          </li>
        </ol>
      </div>

      <div className="help">
        <p>
          Need help? Contact us at <a href="mailto:support@tradesphere.com">support@tradesphere.com</a>
        </p>
      </div>
    </div>
  );
}
```

---

### Task 8: Update Routes

**File**: `src/App.tsx` (or your routing file)

Add routes for new pages:

```tsx
import OwnerRegistrationForm from './components/OwnerRegistrationForm';
import RegistrationSuccess from './pages/RegistrationSuccess';

// In your router:
<Route path="/signup" element={<OwnerRegistrationForm />} />
<Route path="/registration-success" element={<RegistrationSuccess />} />
```

---

### Task 9: Update Pricing Page

**File**: `src/pages/Pricing.tsx` (or wherever pricing plans are displayed)

Add "Get Started" buttons that link to `/signup`:

```tsx
<div className="pricing-plans">
  <div className="plan standard">
    <h3>Standard Plan</h3>
    <p className="price">$2,000/month</p>
    <ul>
      <li>Up to 5 team members</li>
      <li>Unlimited quotes</li>
      <li>AI pricing assistant</li>
      <li>Basic reports</li>
    </ul>
    <a href="/signup?plan=standard" className="btn-primary">Start Free Trial</a>
  </div>

  <div className="plan pro">
    <h3>Pro Plan</h3>
    <p className="price">$3,500/month</p>
    <ul>
      <li>Up to 15 team members</li>
      <li>Advanced AI features</li>
      <li>Custom branding</li>
      <li>Priority support</li>
    </ul>
    <a href="/signup?plan=pro" className="btn-primary">Start Free Trial</a>
  </div>

  <div className="plan enterprise">
    <h3>Enterprise Plan</h3>
    <p className="price">$5,000/month</p>
    <ul>
      <li>Unlimited team members</li>
      <li>Dedicated account manager</li>
      <li>Custom integrations</li>
      <li>White-label options</li>
    </ul>
    <a href="/signup?plan=enterprise" className="btn-primary">Start Free Trial</a>
  </div>
</div>
```

---

## Testing Checklist

### Dwolla Sandbox Testing

1. **Get Sandbox Credentials**
   - Sign up at https://accounts-sandbox.dwolla.com/
   - Create application to get App Key and App Secret
   - Set `DWOLLA_ENVIRONMENT=sandbox` in .env

2. **Test Routing Numbers** (Dwolla sandbox)
   - Valid: `222222226` (passes validation)
   - Invalid: `111111116` (fails validation)

3. **Test Account Numbers** (Dwolla sandbox)
   - Any 10-12 digit number works in sandbox
   - Example: `1234567890`

4. **Test Micro-Deposits**
   - In sandbox, deposits happen instantly (no 1-3 day wait)
   - Check Dwolla dashboard to see initiated deposits
   - Verification amounts will be shown in dashboard

### End-to-End Signup Flow

- [ ] Fill out registration form with all fields
- [ ] Submit form and verify no console errors
- [ ] Check Dwolla dashboard - customer created?
- [ ] Check Dwolla dashboard - funding source created?
- [ ] Check Dwolla dashboard - micro-deposits initiated?
- [ ] Check Supabase Auth - user created?
- [ ] Check Supabase companies table - company record created?
- [ ] Check Supabase users table - user record with owner role?
- [ ] Verify email sent (check logs if not configured)
- [ ] Click onboarding link in email - redirects to app?
- [ ] App auto-authenticates with session token?

### Error Handling

- [ ] Try registering with existing email - shows error?
- [ ] Try invalid routing number - shows error?
- [ ] Try without agreeing to terms - shows error?
- [ ] Try mismatched passwords - shows error?
- [ ] Try with invalid Dwolla credentials - shows helpful error?

---

## Deployment Notes

### Netlify Configuration

1. **Environment Variables** (set in Netlify dashboard):
   ```
   DWOLLA_APP_KEY=your-production-key
   DWOLLA_APP_SECRET=your-production-secret
   DWOLLA_ENVIRONMENT=production
   DWOLLA_MASTER_FUNDING_SOURCE_URL=https://api.dwolla.com/funding-sources/YOUR-BANK-ID
   VITE_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SENDGRID_API_KEY=your-sendgrid-key
   FROM_EMAIL=noreply@tradesphere.com
   APP_URL=https://app.tradesphere.com
   ```

2. **Function Settings**:
   - Timeout: 26 seconds (default is fine)
   - Memory: 1024 MB (for Dwolla SDK)

3. **Build Command**:
   ```bash
   npm run build
   ```

4. **Publish Directory**:
   ```
   dist
   ```

### Pre-Production Checklist

- [ ] Switch Dwolla from sandbox to production environment
- [ ] Update `DWOLLA_ENVIRONMENT=production`
- [ ] Get production Dwolla credentials from dashboard
- [ ] Create TradeSphere's funding source (your company bank account)
- [ ] Update `DWOLLA_MASTER_FUNDING_SOURCE_URL` with production funding source
- [ ] Test with real bank account (your personal test account)
- [ ] Verify micro-deposits arrive in 1-3 business days
- [ ] Configure SendGrid or email service for welcome emails
- [ ] Set up monitoring for signup failures (Sentry, LogRocket, etc.)

---

## Coordination with App Repo

### Shared Resources

1. **Supabase Database**
   - Same database connection (VITE_SUPABASE_URL)
   - Website creates companies and users tables
   - App reads and updates these tables

2. **Dwolla Account**
   - Same Dwolla credentials
   - Same master funding source URL
   - Website creates customers and funding sources
   - App processes webhooks and manages subscriptions

3. **DwollaService.ts**
   - Exact same file copied to both repos
   - Keep in sync if bugs are fixed

### Data Flow

```
Website Creates:
├── Supabase Auth user (auth.users table)
├── Company record (companies table)
│   ├── dwolla_customer_url
│   ├── dwolla_funding_source_id
│   ├── subscription_status: 'trial'
│   ├── payment_method_status: 'pending'
│   └── trial_end_date
├── User record (users table)
│   ├── role: 'owner'
│   └── permissions: { all true }
└── Email with session token → links to app

App Uses:
├── Session token for auto-authentication
├── Company record for onboarding wizard
├── Trial status for UI messaging
└── Payment method status for verification prompts
```

### Communication Protocol

**Website → App**:
- Email with session token (`?token=SESSION_TOKEN`)
- Company ID stored in user metadata
- Trial end date for countdown display

**App → Website**:
- None (app doesn't communicate back to website)

---

## Success Criteria

✅ **Phase 4C Website Tasks Complete When**:

1. Owner can fill out registration form with all required fields
2. Form submits to `signup-with-payment.ts` Netlify function
3. Dwolla customer created successfully
4. Bank account added as funding source
5. Micro-deposits initiated (visible in Dwolla dashboard)
6. Supabase Auth user created
7. Company record created with trial status
8. User record created with owner role
9. Welcome email sent with onboarding link
10. Clicking email link redirects to app with session token
11. All error cases handled gracefully
12. Testing completed in Dwolla sandbox

---

## Support and Resources

### Dwolla Documentation
- API Reference: https://developers.dwolla.com/api-reference
- Sandbox Testing: https://developers.dwolla.com/guides/sandbox
- Customer Creation: https://developers.dwolla.com/api-reference/customers/create
- Funding Sources: https://developers.dwolla.com/api-reference/funding-sources

### Supabase Documentation
- Auth Admin API: https://supabase.com/docs/reference/javascript/auth-admin-api
- Database Client: https://supabase.com/docs/reference/javascript/introduction

### Questions?

Contact the app development team with any questions about:
- Database schema (companies, users, payments tables)
- Session token format and expiration
- Webhook processing (app-side responsibility)
- Payment workflow after registration

---

**Next Steps After Website Tasks**: Once owner registration is working, the app team will implement Phase 4C app-side tasks (onboarding wizard, team invitations, micro-deposit verification UI).
