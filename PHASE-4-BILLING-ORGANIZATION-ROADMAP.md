# Phase 4: Billing & Organization - Implementation Roadmap

**Date**: 2025-10-14
**Project**: TradeSphere Multi-Tenant SaaS Pricing Calculator
**Phase**: Billing, Payments, Onboarding, and Organization Management

---

## Executive Summary

Phase 4 implements a complete billing and organization management system for TradeSphere, enabling self-service company onboarding with payment verification, team invitation workflows, subscription management, and organization settings. This phase transforms TradeSphere from a single-tenant prototype into a production-ready multi-tenant SaaS with automated billing, secure team onboarding, and enterprise-grade organization controls.

**Key Deliverables**:
- Payment-gated company signup flow
- Dwolla payment integration (ACH bank transfers)
- Token-based team invitation system
- Owner billing management UI
- Organization settings & team management UI
- 7-tier role-based access control enforcement
- Secure ACH payment handling

---

## 🚨 CRITICAL: Website vs App Architecture

**TradeSphere has TWO separate React applications:**

### 1. **Company Website** (Marketing Site - Separate GitHub Repo)
**Repository**: Separate React repo (not this one)
**Purpose**: Public marketing site, landing pages, owner signup
**Tech Stack**: React (separate codebase)
**URL**: `https://tradesphere.com` (example)

**Responsibilities**:
- ✅ Marketing content, pricing pages
- ✅ Owner signup/registration form
- ✅ Payment processing (Dwolla ACH Setup)
- ✅ Company creation in shared database
- ✅ Owner account creation in Supabase Auth
- ✅ Send email with link to APP
- ❌ NO team invitations (handled by app)
- ❌ NO billing management (handled by app)
- ❌ NO organization settings (handled by app)

### 2. **TradeSphere App** (Product - THIS Repo)
**Repository**: `tradesphere-no-code-migration` (this repo)
**Purpose**: SaaS product, pricing calculator, customer management
**Tech Stack**: React + TypeScript + Vite + Supabase
**URL**: `https://app.tradesphere.com` (example)

**Responsibilities**:
- ✅ App-side onboarding flow (after owner clicks email link from website)
- ✅ Team invitation system
- ✅ Billing management UI (BillingTab)
- ✅ Organization settings UI (OrganizationTab)
- ✅ Pricing calculator, customer management, etc.
- ❌ NO initial owner signup (handled by website)
- ❌ NO marketing content (handled by website)

---

## Complete Onboarding Flow (Website → App)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1-5: COMPANY WEBSITE (Marketing Site)                     │
└─────────────────────────────────────────────────────────────────┘

Step 1: Potential Customer Visits Website
   └─ URL: https://tradesphere.com

Step 2: Clicks "Get Started" → Registration Tab
   └─ Website shows registration form

Step 3: Owner Fills Registration Form
   ├─ Company name
   ├─ Owner email
   ├─ Owner password
   ├─ Payment information (Dwolla bank account verification)
   └─ Submits form

Step 4: Website Processes Payment
   ├─ Website calls: /.netlify/functions/signup-with-payment
   ├─ Creates Dwolla customer + funding source
   ├─ IF PAYMENT SETUP FAILS → Show error, stop
   └─ IF PAYMENT SETUP SUCCEEDS → Continue

Step 5: Website Creates Company + Owner Account
   ├─ INSERT INTO companies (via shared Supabase database)
   │   ├─ name, email, subscription_status='trial'
   │   ├─ dwolla_customer_url, dwolla_funding_source_id
   │   └─ Get new company_id
   │
   ├─ Supabase Auth: createUser() (via Supabase Admin API)
   │   ├─ email, password
   │   ├─ metadata: { company_id: NEW_COMPANY_ID }
   │   └─ Trigger: handle_new_user() creates users record
   │
   └─ Send email to owner:
       Subject: "Welcome to TradeSphere!"
       Body: "Click here to access your dashboard:
              https://app.tradesphere.com/onboarding?token=AUTO_LOGIN_TOKEN"

┌─────────────────────────────────────────────────────────────────┐
│ STEP 6-9: TRADESPHERE APP (Product - THIS REPO)                │
└─────────────────────────────────────────────────────────────────┘

Step 6: Owner Clicks Email Link
   ├─ URL: https://app.tradesphere.com/onboarding?token=AUTO_LOGIN_TOKEN
   ├─ App validates token
   └─ Auto-authenticates owner via Supabase session

Step 7: APP-SIDE ONBOARDING FLOW (Phase 4C)
   ├─ Welcome screen: "Welcome to TradeSphere!"
   ├─ Company settings:
   │   ├─ AI personality configuration
   │   ├─ Branding (logo, colors)
   │   └─ Industry selection
   │
   └─ Team invitation screen:
       ├─ "Invite your employees"
       ├─ Form: email + role (manager/analyst/sales/field_tech)
       └─ Owner can send invites from here

Step 8: Owner Sends Team Invites (from APP, not website)
   ├─ App calls: /.netlify/functions/invite-team-member
   ├─ Creates invitation record in database
   ├─ Sends email to team member:
   │   "You've been invited to join [Company Name] on TradeSphere!"
   │   "Click here: https://app.tradesphere.com/signup?invite=TOKEN123"
   └─ Owner completes onboarding → Redirected to dashboard

Step 9: Owner Lands in Dashboard
   └─ URL: https://app.tradesphere.com/dashboard

┌─────────────────────────────────────────────────────────────────┐
│ STEP 10-12: TEAM MEMBER SIGNUP (APP)                           │
└─────────────────────────────────────────────────────────────────┘

Step 10: Team Member Receives Invite Email
   └─ Email from app (not website)

Step 11: Team Member Clicks Invite Link
   ├─ URL: https://app.tradesphere.com/signup?invite=TOKEN123
   ├─ App validates token
   └─ Shows signup form (email pre-filled, only needs password)

Step 12: Team Member Creates Account
   ├─ Supabase Auth: signUp() with invitation_token in metadata
   ├─ Trigger: handle_new_user() validates token → assigns role
   └─ Redirected to dashboard (scoped to their company)
```

---

## Shared Database Architecture

**Both Website and App connect to the SAME Supabase database:**

```
SUPABASE DATABASE (Shared)
├─ companies table
│   └─ Used by both website (create) and app (read/update)
│
├─ users table (via Supabase Auth)
│   └─ Used by both website (create owner) and app (read/update/create team)
│
├─ invitations table
│   └─ Used by app only (website doesn't send team invites)
│
├─ payments table
│   └─ Used by both website (initial payment) and app (billing history)
│
└─ payment_webhooks table
    └─ Used by shared webhook endpoint (can be either website or app)
```

---

## Phase 4 Implementation Split

### Website-Side Implementation (Separate Repo)

**Phase 4W: Website Owner Signup** (Not in this repo)
**Agent**: frontend-developer (in website repo)
**Duration**: 4-6 hours
**Files Created** (in website repo):
- Registration form component
- Dwolla bank account verification UI
- API call to `signup-with-payment` function
- Email sending logic (magic link to app)

**Deliverables** (website team):
- [ ] Registration form with Dwolla ACH setup
- [ ] Call to shared `signup-with-payment` Netlify function
- [ ] Email template with link to APP onboarding
- [ ] Success page: "Check your email to access your dashboard"

**⚠️ IMPORTANT**: Website team needs:
- Shared Supabase credentials (same project)
- Shared Dwolla credentials (same account)
- Shared `signup-with-payment` function URL
- Email template with APP URL

---

### App-Side Implementation (THIS Repo)

**All 7 phases (4A-4G) are implemented in THIS repo:**

✅ **Phase 4A**: Database Architecture (shared tables)
✅ **Phase 4B**: Payment Gateway Integration (shared Dwolla service)
✅ **Phase 4C**: App-Side Onboarding Flow (welcome modal, team invites)
✅ **Phase 4D**: Billing UI (BillingTab in app)
✅ **Phase 4E**: Organization UI (OrganizationTab in app)
✅ **Phase 4F**: RBAC Enforcement (app permissions)
✅ **Phase 4G**: Testing & Security Audit (full stack)

---

## Coordination Required

### Shared Resources

1. **Supabase Project** (same for both website and app)
   - Database connection string
   - Supabase URL and Anon Key
   - Service Role Key (for user creation)

2. **Dwolla Account** (same for both website and app)
   - API keys (key + secret)
   - Webhook endpoint (can be hosted with either website or app)
   - Environment (sandbox vs production)

3. **Netlify Functions** (can be duplicated or shared)
   - `signup-with-payment.ts` - Called by website
   - `dwolla-webhook.ts` - Shared webhook handler
   - `invite-team-member.ts` - Called by app only

### Communication Protocol

**Website → App**:
- Website creates company + owner → Sends email with magic link to app
- Magic link format: `https://app.tradesphere.com/onboarding?token=AUTO_LOGIN_TOKEN`
- Token should be a Supabase session token or JWT

**App → Website**:
- No direct communication needed
- App assumes owner already exists (created by website)

### Payload Contracts

**signup-with-payment function** (called by website):
```typescript
// Request from website
{
  email: string;
  password: string;
  companyName: string;
  fundingSourceUrl: string;  // From Dwolla bank verification on website
}

// Response to website
{
  success: boolean;
  company: { id, name, email };
  session: { access_token, refresh_token };
  message: string;
}
```

**Email sent by website** (after signup):
```
To: owner@company.com
Subject: Welcome to TradeSphere!
Body:
  Hi {ownerName},

  Your TradeSphere account is ready!

  Click here to complete your setup and invite your team:
  https://app.tradesphere.com/onboarding?token={SESSION_TOKEN}

  Your 14-day free trial has started. You won't be charged until {trialEndDate}.

  Questions? Reply to this email.

  - The TradeSphere Team
```

**App onboarding route** (/onboarding?token=...):
- Validates session token
- Auto-authenticates user
- Shows onboarding wizard (company settings, team invites)
- On completion → Redirect to /dashboard

---

## Current State Analysis

### Database Schema

**companies table** (Subscription fields present):
```sql
id                    UUID PRIMARY KEY
company_id            VARCHAR (unique identifier)
name                  VARCHAR
email                 VARCHAR
subscription_status   VARCHAR DEFAULT 'trial'
trial_end_date        DATE DEFAULT (NOW() + 14 days)
next_billing_date     DATE
monthly_amount        NUMERIC DEFAULT 2000.00
dwolla_customer_url   VARCHAR
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

**payments table** (Dwolla integration present):
```sql
id                         UUID PRIMARY KEY
company_id                 UUID REFERENCES companies(id)
amount                     NUMERIC
status                     VARCHAR
payment_type               VARCHAR DEFAULT 'monthly_subscription'
subscription_period_start  DATE
subscription_period_end    DATE
dwolla_customer_id         VARCHAR
dwolla_funding_source_id   VARCHAR
dwolla_transfer_id         VARCHAR
ach_status                 VARCHAR
bank_account_name          VARCHAR
bank_account_last4         VARCHAR
processed_at               TIMESTAMP
created_at                 TIMESTAMP
```

**users table** (7-tier role system implemented):
```sql
id               UUID PRIMARY KEY
company_id       UUID REFERENCES companies(id)
email            VARCHAR
name             VARCHAR
role             VARCHAR
is_admin         BOOLEAN DEFAULT false  -- TradeSphere admin
is_developer     BOOLEAN DEFAULT false  -- TradeSphere developer
is_owner         BOOLEAN DEFAULT false  -- Company owner
is_manager       BOOLEAN DEFAULT false  -- Company manager
is_analyst       BOOLEAN DEFAULT false  -- Company analyst
is_sales         BOOLEAN DEFAULT false  -- Company sales
is_field_tech    BOOLEAN DEFAULT false  -- Company field tech
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

**invitations table** (❌ DOES NOT EXIST - needs creation):
```sql
-- NOT YET CREATED
-- Will store pending team invitations with secure tokens
```

### Current Implementation Issues

**1. No Payment Verification Flow** (CRITICAL)
- Companies can be created without payment
- No payment gateway integration
- No subscription lifecycle management
- Hardcoded company_id in `handle_new_user()` trigger

**2. No Team Invitation System** (CRITICAL)
- No way for owners to invite team members
- No `invitations` table
- No token-based invite mechanism
- All new signups default to owner role (temporary workaround)

**3. No Billing UI** (HIGH PRIORITY)
- Owners cannot view subscription status
- No payment method management
- No payment history view
- No subscription upgrade/downgrade/cancel

**4. No Organization Settings UI** (HIGH PRIORITY)
- No company profile management
- No team member management interface
- No role assignment UI
- No branding/AI personality configuration

**5. Incomplete Onboarding Flow** (CRITICAL)
- Missing: Payment → Company Creation → Owner Account → Team Invites
- Current: Direct Supabase auth signup (no payment gate)
- No trial period automation
- No subscription status enforcement

**6. No RBAC Enforcement** (CRITICAL)
- Role flags exist in database but not enforced
- Frontend UI doesn't check roles
- Backend API doesn't validate permissions
- Security gap (see `/docs/critical-reminders/SECURITY-CUSTOMER-SYSTEM.md`)

---

## Architecture Overview

### Onboarding Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ NEW COMPANY SIGNUP FLOW                                         │
└─────────────────────────────────────────────────────────────────┘

Step 1: Owner Signup Page
   ├─ Owner enters: email, password, company name, payment info
   └─ Submits to: /api/signup-with-payment

Step 2: Payment Processing
   ├─ Create Dwolla customer
   ├─ Verify bank account (micro-deposits or instant verification)
   ├─ IF SUCCESS → Continue
   └─ IF FAIL → Show error, do NOT create account

Step 3: Company Creation (ONLY after payment success)
   ├─ INSERT INTO companies (
   │     name, email, subscription_status='active',
   │     trial_end_date=NOW()+14days, next_billing_date,
   │     dwolla_customer_url, monthly_amount
   │  )
   └─ Get new company_id

Step 4: Owner Account Creation
   ├─ Supabase Auth: createUser(email, password)
   ├─ Trigger: handle_new_user() fires
   ├─ INSERT INTO users (
   │     id=auth.uid(), email, company_id=NEW_COMPANY_ID,
   │     is_owner=true, role='owner'
   │  )
   └─ Owner is now authenticated

Step 5: Owner Dashboard
   ├─ Redirect to: /dashboard?onboarding=true
   ├─ Show welcome modal: "Invite your team!"
   └─ Owner can now invite team members

┌─────────────────────────────────────────────────────────────────┐
│ TEAM MEMBER INVITATION FLOW                                     │
└─────────────────────────────────────────────────────────────────┘

Step 1: Owner Invites Team Member
   ├─ Owner clicks "Invite Team" button
   ├─ Enters: email, role (manager/analyst/sales/field_tech)
   └─ Submits to: /api/invite-team-member

Step 2: Invitation Record Created
   ├─ INSERT INTO invitations (
   │     company_id=OWNER_COMPANY_ID,
   │     email, role_type='sales',
   │     token=SECURE_RANDOM_TOKEN,
   │     expires_at=NOW()+7days,
   │     invited_by=auth.uid()
   │  )
   └─ Email sent: "You've been invited to TradeSphere!"

Step 3: Team Member Clicks Invite Link
   ├─ Link: /signup?invite=TOKEN123
   ├─ Page validates token (not expired, not used)
   ├─ Pre-fills email from invitation
   └─ Shows signup form

Step 4: Team Member Signup
   ├─ Supabase Auth: createUser(email, password)
   ├─ Pass invitation token in metadata:
   │    { raw_user_meta_data: { invitation_token: 'TOKEN123' } }
   └─ Trigger: handle_new_user() fires

Step 5: handle_new_user() Processes Invitation
   ├─ Check for invitation_token in metadata
   ├─ IF TOKEN EXISTS:
   │    ├─ Validate token (not expired, not used)
   │    ├─ Get invitation.company_id and invitation.role_type
   │    ├─ INSERT INTO users (
   │    │     id=auth.uid(), email, company_id=FROM_INVITATION,
   │    │     is_[role]=true based on invitation.role_type
   │    │  )
   │    └─ Mark invitation.used=true
   └─ IF NO TOKEN:
        └─ Create as company owner (default flow)

Step 6: Team Member Dashboard
   └─ Redirect to: /dashboard (scoped to their company)
```

### Payment Webhook Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION BILLING WEBHOOK                                    │
└─────────────────────────────────────────────────────────────────┘

Dwolla sends webhook to: /api/webhooks/payment

Event Types:
├─ transfer.completed
│  ├─ Update companies.next_billing_date (+30 days)
│  ├─ INSERT INTO payments (status='succeeded', ...)
│  └─ Ensure companies.subscription_status='active'
│
├─ transfer.failed
│  ├─ INSERT INTO payments (status='failed', ...)
│  ├─ Update companies.subscription_status='past_due'
│  └─ Send email: "Payment failed, please update"
│
├─ customer.funding_source_removed
│  ├─ Update companies.subscription_status='past_due'
│  ├─ Send email: "Please add new bank account"
│  └─ Block access if not resolved within grace period
│
└─ trial.ending_soon (custom event)
   ├─ Send email: "Trial ends in 3 days"
   └─ companies.subscription_status='trial'
```

---

## Implementation Phases

### Phase 4A: Database Architecture ⚡ CRITICAL
**Agent**: **payment-integration**
**Duration**: 3-4 hours
**Priority**: CRITICAL - Foundation for all billing

**Objectives**:
1. Create `invitations` table with secure token system
2. Update `handle_new_user()` to support owner signup AND invited users
3. Add payment verification fields to `companies` table
4. Create payment webhook tables for event logging

**Database Schema**:

**invitations table**:
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('manager', 'analyst', 'sales', 'field_tech')),
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Prevent duplicate pending invitations
  UNIQUE(company_id, email) WHERE used = false,

  -- Prevent inviting existing company users
  CONSTRAINT no_self_invite CHECK (
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE users.email = invitations.email
      AND users.company_id = invitations.company_id
    )
  )
);

CREATE INDEX idx_invitations_token ON invitations(token) WHERE used = false;
CREATE INDEX idx_invitations_company ON invitations(company_id);
CREATE INDEX idx_invitations_email ON invitations(email);
```

**payment_webhooks table** (event logging):
```sql
CREATE TABLE payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  company_id UUID REFERENCES companies(id),
  payment_id UUID REFERENCES payments(id),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_webhooks_company ON payment_webhooks(company_id);
CREATE INDEX idx_payment_webhooks_type ON payment_webhooks(event_type);
CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed) WHERE processed = false;
```

**Updated handle_new_user() function**:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation_record RECORD;
  v_company_id UUID;
  v_is_owner BOOLEAN := false;
  v_is_manager BOOLEAN := false;
  v_is_analyst BOOLEAN := false;
  v_is_sales BOOLEAN := false;
  v_is_field_tech BOOLEAN := false;
  v_role TEXT := 'user';
BEGIN
  -- Check for invitation token in user metadata
  IF NEW.raw_user_meta_data ? 'invitation_token' THEN
    -- INVITED USER FLOW
    SELECT * INTO v_invitation_record
    FROM invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND used = false
      AND expires_at > NOW();

    IF FOUND THEN
      -- Valid invitation found
      v_company_id := v_invitation_record.company_id;
      v_role := v_invitation_record.role_type;

      -- Set role flags based on invitation
      CASE v_invitation_record.role_type
        WHEN 'manager' THEN v_is_manager := true;
        WHEN 'analyst' THEN v_is_analyst := true;
        WHEN 'sales' THEN v_is_sales := true;
        WHEN 'field_tech' THEN v_is_field_tech := true;
      END CASE;

      -- Mark invitation as used
      UPDATE invitations
      SET used = true, used_at = NOW()
      WHERE id = v_invitation_record.id;
    ELSE
      -- Invalid/expired token
      RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;
  ELSE
    -- OWNER SIGNUP FLOW (no invitation token)
    -- Company should have been created by signup API
    -- Get company_id from user metadata (passed by signup API)
    IF NEW.raw_user_meta_data ? 'company_id' THEN
      v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
      v_is_owner := true;
      v_role := 'owner';
    ELSE
      -- Fallback: hardcoded company (for development only)
      v_company_id := '08f0827a-608f-485a-a19f-e0c55ecf6484';
      v_is_owner := true;
      v_role := 'owner';
      RAISE WARNING 'No company_id in metadata, using default company (development only)';
    END IF;
  END IF;

  -- Insert user with determined role
  INSERT INTO public.users (
    id,
    email,
    name,
    company_id,
    role,
    is_admin,
    is_developer,
    is_owner,
    is_manager,
    is_analyst,
    is_sales,
    is_field_tech,
    user_icon,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_company_id,
    v_role,
    false,  -- is_admin (TradeSphere admin only)
    false,  -- is_developer (TradeSphere developer only)
    v_is_owner,
    v_is_manager,
    v_is_analyst,
    v_is_sales,
    v_is_field_tech,
    'User',
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**companies table enhancements**:
```sql
-- Add payment verification fields (DWOLLA ACH INTEGRATION)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS dwolla_customer_url TEXT,
ADD COLUMN IF NOT EXISTS dwolla_funding_source_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Index for payment lookups
CREATE INDEX idx_companies_dwolla_customer ON companies(dwolla_customer_url);
CREATE INDEX idx_companies_subscription_status ON companies(subscription_status);
CREATE INDEX idx_companies_next_billing ON companies(next_billing_date);
CREATE INDEX idx_companies_billing_cycle ON companies(billing_cycle_day, subscription_status);
```

**Deliverables**:
- Migration script: `10-CREATE-INVITATIONS-TABLE.sql`
- Migration script: `11-UPDATE-HANDLE-NEW-USER-FUNCTION.sql`
- Migration script: `12-ENHANCE-COMPANIES-PAYMENT-FIELDS.sql`
- Migration script: `13-CREATE-PAYMENT-WEBHOOKS-TABLE.sql`

**Files Created**:
- `database/migrations/10-CREATE-INVITATIONS-TABLE.sql`
- `database/migrations/11-UPDATE-HANDLE-NEW-USER-FUNCTION.sql`
- `database/migrations/12-ENHANCE-COMPANIES-PAYMENT-FIELDS.sql`
- `database/migrations/13-CREATE-PAYMENT-WEBHOOKS-TABLE.sql`

---

### Phase 4B: Payment Gateway Integration 💳 CRITICAL
**Agent**: **payment-integration**
**Duration**: 6-8 hours
**Priority**: CRITICAL - Revenue infrastructure

**Objectives**:
1. Integrate Dwolla API for ACH payment processing
2. Create Dwolla customer records
3. Handle subscription webhooks (transfer.completed, transfer.failed, etc.)
4. Implement trial period automation
5. Create payment verification API endpoint

**Dwolla Integration**:

**DwollaService.ts**:
```typescript
import { Client } from 'dwolla-v2';

export class DwollaService {
  private dwolla: Client;

  constructor() {
    this.dwolla = new Client({
      key: process.env.DWOLLA_APP_KEY!,
      secret: process.env.DWOLLA_APP_SECRET!,
      environment: process.env.DWOLLA_ENVIRONMENT as 'production' | 'sandbox'
    });
  }

  /**
   * Create Dwolla customer for new company
   */
  async createCustomer(params: {
    email: string;
    companyName: string;
    firstName: string;
    lastName: string;
  }): Promise<string> {
    const requestBody = {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      type: 'business',
      businessName: params.companyName,
      businessType: 'llc', // or get from signup form
      businessClassification: '9ed3f670-7d6f-11e3-b1ce-5404a6144203', // Default classification
    };

    const customer = await this.dwolla.post('customers', requestBody);
    return customer.headers.get('location'); // Returns customer URL
  }

  /**
   * Create funding source (bank account) for customer
   */
  async createFundingSource(params: {
    customerUrl: string;
    routingNumber: string;
    accountNumber: string;
    bankAccountType: 'checking' | 'savings';
    name: string;
  }): Promise<string> {
    const requestBody = {
      routingNumber: params.routingNumber,
      accountNumber: params.accountNumber,
      bankAccountType: params.bankAccountType,
      name: params.name
    };

    const fundingSource = await this.dwolla.post(
      `${params.customerUrl}/funding-sources`,
      requestBody
    );
    return fundingSource.headers.get('location'); // Returns funding source URL
  }

  /**
   * Initiate micro-deposit verification
   */
  async initiateMicroDeposits(fundingSourceUrl: string): Promise<void> {
    await this.dwolla.post(`${fundingSourceUrl}/micro-deposits`);
  }

  /**
   * Verify micro-deposits
   */
  async verifyMicroDeposits(
    fundingSourceUrl: string,
    amount1: number,
    amount2: number
  ): Promise<void> {
    await this.dwolla.post(`${fundingSourceUrl}/micro-deposits`, {
      amount1: { value: amount1.toString(), currency: 'USD' },
      amount2: { value: amount2.toString(), currency: 'USD' }
    });
  }

  /**
   * Create transfer (subscription payment)
   */
  async createTransfer(params: {
    sourceFundingSourceUrl: string; // Customer's bank account
    destinationFundingSourceUrl: string; // TradeSphere's account
    amount: number;
    metadata?: Record<string, string>;
  }): Promise<string> {
    const requestBody = {
      _links: {
        source: { href: params.sourceFundingSourceUrl },
        destination: { href: params.destinationFundingSourceUrl }
      },
      amount: {
        currency: 'USD',
        value: params.amount.toFixed(2)
      },
      metadata: params.metadata || {}
    };

    const transfer = await this.dwolla.post('transfers', requestBody);
    return transfer.headers.get('location'); // Returns transfer URL
  }

  /**
   * Get transfer status
   */
  async getTransfer(transferUrl: string): Promise<any> {
    const transfer = await this.dwolla.get(transferUrl);
    return transfer.body;
  }

  /**
   * Cancel transfer (if still pending)
   */
  async cancelTransfer(transferUrl: string): Promise<void> {
    await this.dwolla.post(`${transferUrl}`, { status: 'cancelled' });
  }

  /**
   * Get customer funding sources
   */
  async getFundingSources(customerUrl: string): Promise<any[]> {
    const response = await this.dwolla.get(`${customerUrl}/funding-sources`);
    return response.body._embedded['funding-sources'];
  }

  /**
   * Remove funding source
   */
  async removeFundingSource(fundingSourceUrl: string): Promise<void> {
    await this.dwolla.post(`${fundingSourceUrl}`, { removed: true });
  }

  /**
   * Get customer transfers (payment history)
   */
  async getTransfers(customerUrl: string): Promise<any[]> {
    const response = await this.dwolla.get(`${customerUrl}/transfers`, {
      limit: 100
    });
    return response.body._embedded.transfers;
  }
}
```

**Webhook Handler** (`netlify/functions/dwolla-webhook.ts`):
```typescript
import { Handler } from '@netlify/functions';
import crypto from 'crypto';
import { getSupabase } from '../../src/services/supabase';

const webhookSecret = process.env.DWOLLA_WEBHOOK_SECRET!;

export const handler: Handler = async (event) => {
  // Verify webhook signature
  const signature = event.headers['x-dwolla-signature'];

  const hmac = crypto.createHmac('sha256', webhookSecret);
  const computedSignature = hmac.update(event.body!).digest('hex');

  if (signature !== computedSignature) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid webhook signature' })
    };
  }

  const dwollaEvent = JSON.parse(event.body!);
  const supabase = getSupabase();

  // Log webhook event
  await supabase.from('payment_webhooks').insert({
    event_type: dwollaEvent.topic,
    payload: dwollaEvent,
    created_at: new Date().toISOString()
  });

  // Handle event types
  switch (dwollaEvent.topic) {
    case 'transfer_completed': {
      const transferUrl = dwollaEvent._links.resource.href;

      // Extract transfer ID from metadata to find company
      const { data: payment } = await supabase
        .from('payments')
        .select('company_id, amount')
        .eq('dwolla_transfer_id', transferUrl)
        .single();

      if (payment) {
        // Update payment status
        await supabase
          .from('payments')
          .update({
            status: 'succeeded',
            processed_at: new Date().toISOString()
          })
          .eq('dwolla_transfer_id', transferUrl);

        // Update company subscription status
        await supabase
          .from('companies')
          .update({
            subscription_status: 'active',
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          })
          .eq('id', payment.company_id);
      }
      break;
    }

    case 'transfer_failed': {
      const transferUrl = dwollaEvent._links.resource.href;

      const { data: payment } = await supabase
        .from('payments')
        .select('company_id')
        .eq('dwolla_transfer_id', transferUrl)
        .single();

      if (payment) {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          .eq('dwolla_transfer_id', transferUrl);

        await supabase
          .from('companies')
          .update({ subscription_status: 'past_due' })
          .eq('id', payment.company_id);

        // TODO: Send email notification to company owner
      }
      break;
    }

    case 'customer_funding_source_removed': {
      const customerUrl = dwollaEvent._links.customer.href;

      // Find company by Dwolla customer URL
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('dwolla_customer_url', customerUrl)
        .single();

      if (company) {
        await supabase
          .from('companies')
          .update({ subscription_status: 'past_due' })
          .eq('id', company.id);

        // TODO: Send email to add new funding source
      }
      break;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
```

**Deliverables**:
- `src/services/DwollaService.ts` - Dwolla API wrapper for ACH payments
- `netlify/functions/dwolla-webhook.ts` - Webhook handler
- `src/types/payment.ts` - Payment type definitions
- Environment variables documentation

**Files Created**:
- `src/services/DwollaService.ts`
- `netlify/functions/dwolla-webhook.ts`
- `src/types/payment.ts`

---

### Phase 4C: Onboarding Flow 🚀 CRITICAL
**Agent**: **backend-architect** + **frontend-developer**
**Duration**: 8-10 hours
**Priority**: CRITICAL - User acquisition

**Objectives**:
1. Build owner signup page with payment form
2. Create company-creation API (after payment verification)
3. Build team invitation email flow
4. Create invited-user signup page
5. Implement onboarding success screens

**Owner Signup API** (`netlify/functions/signup-with-payment.ts`):
```typescript
import { Handler } from '@netlify/functions';
import { StripeService } from '../../src/services/StripeService';
import { getSupabase } from '../../src/services/supabase';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const { email, password, companyName, paymentMethodId } = JSON.parse(event.body!);

  const stripe = new StripeService();
  const supabase = getSupabase();
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Admin key for user creation
  );

  try {
    // Step 1: Create Stripe subscription
    const subscription = await stripe.createSubscription({
      email,
      companyName,
      paymentMethodId,
      priceId: process.env.STRIPE_PRICE_ID!,  // Monthly subscription price
      trialDays: 14
    });

    // Step 2: Create company record in database
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        email,
        subscription_status: 'trial',
        trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        next_billing_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        stripe_customer_id: subscription.customerId,
        stripe_subscription_id: subscription.subscriptionId,
        monthly_amount: 2000.00
      })
      .select()
      .single();

    if (companyError) throw companyError;

    // Step 3: Create owner user account via Supabase Admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Auto-confirm email for paid accounts
      user_metadata: {
        full_name: companyName,
        company_id: company.id  // Pass company_id to handle_new_user trigger
      }
    });

    if (authError) {
      // Rollback: Cancel Stripe subscription
      await stripe.cancelSubscription(subscription.subscriptionId, true);
      // Rollback: Delete company
      await supabase.from('companies').delete().eq('id', company.id);
      throw authError;
    }

    // Step 4: Create session for immediate login
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
      user_id: authUser.user.id
    });

    if (sessionError) throw sessionError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        session: session,
        company: company,
        message: 'Account created successfully!'
      })
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
```

**Team Invitation API** (`netlify/functions/invite-team-member.ts`):
```typescript
import { Handler } from '@netlify/functions';
import { getSupabase } from '../../src/services/supabase';

export const handler: Handler = async (event) => {
  const { email, roleType } = JSON.parse(event.body!);
  const authHeader = event.headers.authorization;

  const supabase = getSupabase();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser(authHeader?.split(' ')[1] || '');

  if (!user) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  // Get user's company and role
  const { data: userData } = await supabase
    .from('users')
    .select('company_id, is_owner, is_manager')
    .eq('id', user.id)
    .single();

  // Only owners and managers can invite
  if (!userData?.is_owner && !userData?.is_manager) {
    return { statusCode: 403, body: 'Forbidden: Only owners and managers can invite team members' };
  }

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      company_id: userData.company_id,
      email,
      role_type: roleType,
      invited_by: user.id
    })
    .select()
    .single();

  if (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }

  // TODO: Send invitation email
  // sendInvitationEmail(email, invitation.token, userData.company_name);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      invitation,
      inviteUrl: `${process.env.URL}/signup?invite=${invitation.token}`
    })
  };
};
```

**Owner Signup Component** (`src/components/auth/OwnerSignup.tsx`):
```typescript
import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export function OwnerSignup() {
  const stripe = useStripe();
  const elements = useElements();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // Create payment method
      const cardElement = elements.getElement(CardElement);
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement!,
        billing_details: {
          email: formData.email,
          name: formData.companyName
        }
      });

      if (pmError) {
        setError(pmError.message || 'Payment method creation failed');
        setLoading(false);
        return;
      }

      // Call signup API
      const response = await fetch('/.netlify/functions/signup-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          paymentMethodId: paymentMethod!.id
        })
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Success! Redirect to dashboard
      window.location.href = '/dashboard?onboarding=true';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Start Your 14-Day Free Trial
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Information
            </label>
            <div className="p-3 border border-gray-300 rounded-md">
              <CardElement options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': { color: '#aab7c4' }
                  }
                }
              }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              You won't be charged during your 14-day trial. Cancel anytime.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !stripe}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating Account...' : 'Start Free Trial'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          $2,000/month after trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
```

**Invited User Signup Component** (`src/components/auth/InvitedUserSignup.tsx`):
```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSupabase } from '../../services/supabase';

export function InvitedUserSignup() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');

  useEffect(() => {
    validateInvitation();
  }, [inviteToken]);

  const validateInvitation = async () => {
    if (!inviteToken) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    const { data, error: dbError } = await supabase
      .from('invitations')
      .select('*, companies(name)')
      .eq('token', inviteToken)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (dbError || !data) {
      setError('Invitation expired or invalid');
      setLoading(false);
      return;
    }

    setInvitation(data);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = getSupabase();

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            invitation_token: inviteToken  // Pass to handle_new_user
          }
        }
      });

      if (signupError) throw signupError;

      // Success! Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">
            Invalid Invitation
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Join {invitation.companies.name}
        </h1>
        <p className="text-gray-600 mb-6">
          You've been invited as a <span className="font-semibold">{invitation.role_type}</span>
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={invitation.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Create Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            {loading ? 'Creating Account...' : 'Join Team'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Deliverables**:
- Owner signup page with Stripe payment form
- Team invitation API endpoint
- Invited user signup page
- Email templates for invitations
- Onboarding success screens

**Files Created**:
- `src/components/auth/OwnerSignup.tsx`
- `src/components/auth/InvitedUserSignup.tsx`
- `netlify/functions/signup-with-payment.ts`
- `netlify/functions/invite-team-member.ts`
- `src/components/onboarding/WelcomeModal.tsx`
- Email templates in `src/emails/`

---

### Phase 4D: Billing UI 💰 HIGH
**Agent**: **frontend-developer**
**Duration**: 6-8 hours
**Priority**: HIGH - Owner self-service

**Objectives**:
1. Build BillingTab component for subscription management
2. Display current subscription status
3. Payment method update interface
4. Payment history view
5. Subscription cancel/upgrade UI

**BillingTab Component** (`src/components/billing/BillingTab.tsx`):
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabase } from '../../services/supabase';
import { StripeService } from '../../services/StripeService';

export function BillingTab() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, [user]);

  const loadBillingData = async () => {
    const supabase = getSupabase();

    // Get company data
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', user.company_id)
      .single();

    setCompany(companyData);

    // Get payment history
    const { data: paymentData } = await supabase
      .from('payments')
      .select('*')
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false })
      .limit(10);

    setPayments(paymentData || []);
    setLoading(false);
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    const response = await fetch('/.netlify/functions/cancel-subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await supabase.auth.getSession()}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      alert('Subscription canceled. You have access until the end of your billing period.');
      loadBillingData();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Subscription</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-semibold">
              {company.subscription_status === 'active' && (
                <span className="text-green-600">Active</span>
              )}
              {company.subscription_status === 'trial' && (
                <span className="text-blue-600">Trial</span>
              )}
              {company.subscription_status === 'past_due' && (
                <span className="text-red-600">Past Due</span>
              )}
              {company.subscription_status === 'canceled' && (
                <span className="text-gray-600">Canceled</span>
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Monthly Amount</p>
            <p className="text-lg font-semibold">
              ${company.monthly_amount.toFixed(2)}
            </p>
          </div>

          {company.subscription_status === 'trial' && (
            <div>
              <p className="text-sm text-gray-600">Trial Ends</p>
              <p className="text-lg font-semibold">
                {new Date(company.trial_end_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {company.subscription_status === 'active' && (
            <div>
              <p className="text-sm text-gray-600">Next Billing Date</p>
              <p className="text-lg font-semibold">
                {new Date(company.next_billing_date).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {/* Open update payment modal */}}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update Payment Method
          </button>

          {company.subscription_status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Payment History</h2>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Period</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id} className="border-b">
                <td className="py-2">
                  {new Date(payment.created_at).toLocaleDateString()}
                </td>
                <td className="py-2">${payment.amount.toFixed(2)}</td>
                <td className="py-2">
                  {payment.status === 'succeeded' && (
                    <span className="text-green-600">Paid</span>
                  )}
                  {payment.status === 'failed' && (
                    <span className="text-red-600">Failed</span>
                  )}
                </td>
                <td className="py-2">
                  {payment.subscription_period_start && (
                    <>
                      {new Date(payment.subscription_period_start).toLocaleDateString()} -{' '}
                      {new Date(payment.subscription_period_end).toLocaleDateString()}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Deliverables**:
- BillingTab component
- UpdatePaymentMethodModal component
- CancelSubscriptionModal component
- Payment history table
- Subscription status indicators

**Files Created**:
- `src/components/billing/BillingTab.tsx`
- `src/components/billing/UpdatePaymentMethodModal.tsx`
- `src/components/billing/CancelSubscriptionModal.tsx`
- `src/components/billing/PaymentHistory.tsx`

---

### Phase 4E: Organization Settings UI ⚙️ HIGH
**Agent**: **frontend-developer**
**Duration**: 6-8 hours
**Priority**: HIGH - Team management

**Objectives**:
1. Build OrganizationTab component
2. Company profile editor
3. Team member list with role badges
4. Invite team member modal
5. Remove team member functionality
6. Change role functionality (owner only)

**OrganizationTab Component** (`src/components/organization/OrganizationTab.tsx`):
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabase } from '../../services/supabase';

export function OrganizationTab() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    loadOrganizationData();
  }, [user]);

  const loadOrganizationData = async () => {
    const supabase = getSupabase();

    // Get company
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', user.company_id)
      .single();

    setCompany(companyData);

    // Get team members
    const { data: membersData } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: true });

    setTeamMembers(membersData || []);

    // Get pending invitations
    const { data: invitesData } = await supabase
      .from('invitations')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());

    setPendingInvitations(invitesData || []);
  };

  const handleInviteTeamMember = async (email: string, roleType: string) => {
    const response = await fetch('/.netlify/functions/invite-team-member', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await supabase.auth.getSession()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, roleType })
    });

    if (response.ok) {
      alert('Invitation sent!');
      loadOrganizationData();
      setShowInviteModal(false);
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    const supabase = getSupabase();

    // Soft delete user
    await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('company_id', user.company_id);

    loadOrganizationData();
  };

  return (
    <div className="space-y-6">
      {/* Company Profile */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Company Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              type="text"
              value={company?.name || ''}
              className="mt-1 block w-full rounded-md border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company Email
            </label>
            <input
              type="email"
              value={company?.email || ''}
              className="mt-1 block w-full rounded-md border-gray-300"
            />
          </div>

          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Save Changes
          </button>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Team Members</h2>

          {(user.is_owner || user.is_manager) && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Invite Team Member
            </button>
          )}
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Role</th>
              <th className="text-left py-2">Joined</th>
              {user.is_owner && <th className="text-left py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {teamMembers.map(member => (
              <tr key={member.id} className="border-b">
                <td className="py-2">{member.name}</td>
                <td className="py-2">{member.email}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    member.is_owner ? 'bg-purple-100 text-purple-800' :
                    member.is_manager ? 'bg-blue-100 text-blue-800' :
                    member.is_sales ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role}
                  </span>
                </td>
                <td className="py-2">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                {user.is_owner && !member.is_owner && (
                  <td className="py-2">
                    <button
                      onClick={() => handleRemoveTeamMember(member.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Pending Invitations</h2>

          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Role</th>
                <th className="text-left py-2">Expires</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvitations.map(invite => (
                <tr key={invite.id} className="border-b">
                  <td className="py-2">{invite.email}</td>
                  <td className="py-2">{invite.role_type}</td>
                  <td className="py-2">
                    {new Date(invite.expires_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteTeamMemberModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteTeamMember}
        />
      )}
    </div>
  );
}
```

**Deliverables**:
- OrganizationTab component
- Team member list with role badges
- InviteTeamMemberModal component
- Remove team member functionality
- Pending invitations view

**Files Created**:
- `src/components/organization/OrganizationTab.tsx`
- `src/components/organization/InviteTeamMemberModal.tsx`
- `src/components/organization/TeamMemberRow.tsx`

---

### Phase 4F: RBAC Enforcement 🔒 CRITICAL
**Agent**: **security-auditor** + **backend-architect**
**Duration**: 4-6 hours
**Priority**: CRITICAL - Security

**Objectives**:
1. Frontend role checks (show/hide UI elements)
2. Backend API role validation
3. RLS policies for billing/organization data
4. Audit logging for sensitive operations

**RBAC Middleware** (`src/middleware/rbac.ts`):
```typescript
import { getSupabase } from '../services/supabase';

export async function requireRole(
  userId: string,
  allowedRoles: ('owner' | 'manager' | 'admin')[]
): Promise<boolean> {
  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('is_owner, is_manager, is_admin')
    .eq('id', userId)
    .single();

  if (!user) return false;

  for (const role of allowedRoles) {
    if (role === 'owner' && user.is_owner) return true;
    if (role === 'manager' && (user.is_manager || user.is_owner)) return true;
    if (role === 'admin' && user.is_admin) return true;
  }

  return false;
}
```

**RLS Policies**:
```sql
-- Billing data: Only owners can access
CREATE POLICY billing_owner_only ON companies
  FOR ALL
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND is_owner = true
    )
  );

-- Team invitations: Owners and managers can create
CREATE POLICY invitations_create_rbac ON invitations
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
        AND (is_owner = true OR is_manager = true)
    )
  );

-- Team members: All can view their company
CREATE POLICY users_view_company ON users
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Team members: Only owners can update roles
CREATE POLICY users_update_owner_only ON users
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND is_owner = true
    )
  );
```

**Deliverables**:
- RBAC middleware functions
- RLS policies for billing/organization tables
- Frontend role-check hooks
- Audit logging for role changes

**Files Created**:
- `src/middleware/rbac.ts`
- `database/migrations/14-BILLING-ORGANIZATION-RLS-POLICIES.sql`
- `src/hooks/usePermissions.ts`

---

### Phase 4G: Testing & Security Audit 🧪 CRITICAL
**Agent**: **test-automator** + **security-auditor**
**Duration**: 6-8 hours
**Priority**: CRITICAL - Production readiness

**Objectives**:
1. Payment flow integration tests
2. Invitation token security tests
3. Subscription webhook tests
4. PCI compliance audit
5. RBAC enforcement tests

**Test Suites**:

**Payment Flow Tests** (`tests/payment-flow.test.ts`):
```typescript
describe('Payment Flow', () => {
  it('should create company after successful payment')
  it('should rollback on payment failure')
  it('should create owner account with correct role')
  it('should start 14-day trial period')
  it('should process monthly recurring payments')
  it('should handle payment webhook events')
})
```

**Invitation Flow Tests** (`tests/invitation-flow.test.ts`):
```typescript
describe('Invitation Flow', () => {
  it('should create invitation token')
  it('should prevent duplicate invitations')
  it('should expire tokens after 7 days')
  it('should validate token on signup')
  it('should assign correct role from invitation')
  it('should mark invitation as used after signup')
})
```

**RBAC Tests** (`tests/rbac.test.ts`):
```typescript
describe('RBAC Enforcement', () => {
  it('should allow owners to invite team members')
  it('should deny non-owners from accessing billing')
  it('should enforce RLS policies on billing data')
  it('should audit role changes')
})
```

**Security Audit Checklist**:
- [ ] PCI DSS compliance (no card data stored)
- [ ] Invitation tokens are cryptographically secure
- [ ] Webhook signatures verified (Stripe)
- [ ] Payment data encrypted at rest
- [ ] No sensitive data in client logs
- [ ] RBAC enforced at database level (RLS)
- [ ] XSS prevention in payment forms
- [ ] CSRF protection on payment endpoints

**Deliverables**:
- Complete test suite (>80% coverage)
- Security audit report
- PCI compliance documentation
- Webhook integration tests

**Files Created**:
- `tests/payment-flow.test.ts`
- `tests/invitation-flow.test.ts`
- `tests/subscription-webhooks.test.ts`
- `tests/rbac.test.ts`
- `/docs/pre-production-map/PHASE-4-SECURITY-AUDIT.md`

---

## Implementation Timeline

### Critical Path

```
Week 1 (24-32 hours):
├─ Day 1-2: Phase 4A - Database Architecture (3-4 hours)
├─ Day 2-3: Phase 4B - Payment Gateway Integration (6-8 hours)
├─ Day 4-5: Phase 4C - Onboarding Flow (8-10 hours)
└─ Day 5: Phase 4F - RBAC Enforcement (4-6 hours)

Week 2 (12-16 hours):
├─ Day 1-2: Phase 4D - Billing UI (6-8 hours)
├─ Day 2-3: Phase 4E - Organization UI (6-8 hours)
└─ Day 3-4: Phase 4G - Testing & Security Audit (6-8 hours)

Total: 36-48 hours (~1-2 weeks for 1 developer)
```

### Parallel Workstreams

**Backend Track** (can run in parallel):
- Phase 4A: Database Architecture
- Phase 4B: Payment Integration
- Phase 4C: Onboarding APIs
- Phase 4F: RBAC Backend

**Frontend Track** (depends on backend):
- Phase 4C: Onboarding UI (after 4A, 4B)
- Phase 4D: Billing UI (after 4B)
- Phase 4E: Organization UI (after 4A)

**Testing Track** (after all phases):
- Phase 4G: Testing & Security Audit

---

## Dependencies

### External Services Required

1. **Stripe Account**
   - Create Stripe account
   - Get API keys (test + production)
   - Create product + price IDs
   - Configure webhook endpoint
   - Set up webhook secret

2. **Email Service** (for invitations)
   - SendGrid/Mailgun/AWS SES
   - Configure SMTP credentials
   - Design invitation email templates

3. **Environment Variables**
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...  # Monthly subscription price

# Email
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@tradesphere.com

# Supabase Admin (for user creation)
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

### Database Prerequisites

- ✅ `companies` table exists
- ✅ `payments` table exists
- ✅ `users` table with role columns exists
- ❌ `invitations` table (Phase 4A)
- ❌ `payment_webhooks` table (Phase 4A)
- ❌ Updated `handle_new_user()` function (Phase 4A)

---

## Rollback Plan

### If Payment Integration Fails

1. Temporarily disable payment gate
2. Allow free company creation (manual billing)
3. Owner creates account → admin manually enters Stripe customer ID
4. Revert to manual invoicing until fixed

### If Invitation System Fails

1. Owners manually share temporary passwords
2. Admin manually creates user accounts with correct roles
3. Revert to email-based invitation (no tokens)

### If Webhook Processing Fails

1. Manual payment verification via Stripe dashboard
2. Admin manually updates company subscription status
3. Implement retry queue for failed webhooks

---

## Success Metrics

### Technical Metrics

- [ ] Payment success rate >98%
- [ ] Webhook processing <5 seconds
- [ ] Invitation delivery rate >95%
- [ ] Zero payment data stored locally (PCI compliant)
- [ ] RBAC enforcement 100% (no bypass possible)
- [ ] Test coverage >80%

### Business Metrics

- [ ] Trial-to-paid conversion rate >20%
- [ ] Onboarding completion rate >80%
- [ ] Payment failure rate <2%
- [ ] Team invitation acceptance rate >60%
- [ ] Subscription churn rate <5%/month

---

## Production Readiness Checklist

### Before Launch

- [ ] Stripe production keys configured
- [ ] Webhook endpoints tested with production Stripe account
- [ ] Email templates designed and approved
- [ ] Invitation flow tested end-to-end
- [ ] Payment failure handling tested
- [ ] RBAC enforced at database level (RLS enabled)
- [ ] Security audit passed
- [ ] PCI compliance verified
- [ ] Load testing completed (100+ concurrent signups)
- [ ] Monitoring/alerting configured for:
  - [ ] Payment failures
  - [ ] Webhook processing errors
  - [ ] Invitation delivery failures
  - [ ] RBAC violations

### Documentation Required

- [ ] Owner onboarding guide
- [ ] Team invitation instructions
- [ ] Billing FAQ
- [ ] API documentation for webhooks
- [ ] Troubleshooting guide (payment failures, invitations)

---

## Notes & Considerations

### Trial Period Strategy

**Current**: 14-day free trial, payment method required upfront
**Alternative**: 7-day free trial, no payment method required (risk of low conversion)
**Recommendation**: Keep 14-day trial with payment method to qualify leads

### Payment Gateway Choice

**Stripe** (Recommended):
- ✅ Best developer experience
- ✅ Excellent webhook reliability
- ✅ Built-in subscription management
- ✅ Comprehensive dashboard
- ❌ Higher fees (2.9% + 30¢)

**Dwolla** (ACH only):
- ✅ Lower fees (0.5% capped at $5)
- ✅ Direct bank transfers
- ❌ More complex API
- ❌ ACH takes 3-5 business days
- ❌ Requires business verification

**Recommendation**: Start with Stripe for speed, add Dwolla later for cost savings on high-volume customers

### Team Invitation Security

**Token Security**:
- 32-byte cryptographically secure random tokens
- 7-day expiration (reasonable window)
- Single-use tokens (marked as used after signup)
- No PII in token itself (company_id/role stored separately)

**Attack Vectors Mitigated**:
- Token brute-forcing (32 bytes = 2^256 possibilities)
- Token reuse (marked as used)
- Expired token usage (database-level validation)
- Cross-company invitation (company_id validated)

### RBAC Edge Cases

**What happens if last owner leaves?**
- Prevent deletion if only owner
- Require transfer of ownership first
- Admin override for abandoned accounts

**Can managers invite owners?**
- No - only existing owners can invite owners
- Prevents privilege escalation

**Can users have multiple roles?**
- Yes - role flags are boolean (e.g., is_owner AND is_sales)
- Use case: Owner who also does sales

---

## Agent Workflow Summary

```
Phase 4A: payment-integration agent
  ├─ Creates invitations table
  ├─ Updates handle_new_user() function
  ├─ Enhances companies table
  └─ Creates payment_webhooks table

Phase 4B: payment-integration agent
  ├─ Implements StripeService.ts
  ├─ Creates webhook handler
  └─ Configures Stripe integration

Phase 4C: backend-architect + frontend-developer agents
  ├─ Backend: signup-with-payment API
  ├─ Backend: invite-team-member API
  ├─ Frontend: OwnerSignup component
  └─ Frontend: InvitedUserSignup component

Phase 4D: frontend-developer agent
  ├─ Creates BillingTab component
  └─ Implements payment management UI

Phase 4E: frontend-developer agent
  ├─ Creates OrganizationTab component
  └─ Implements team management UI

Phase 4F: security-auditor + backend-architect agents
  ├─ Implements RBAC middleware
  ├─ Creates RLS policies
  └─ Adds audit logging

Phase 4G: test-automator + security-auditor agents
  ├─ Generates test suites
  ├─ Performs security audit
  └─ Validates PCI compliance
```

---

**Document Status**: ✅ COMPLETE - Ready for Implementation
**Next Steps**: Begin Phase 4A with payment-integration agent
**Estimated Completion**: 1-2 weeks (36-48 hours total)
