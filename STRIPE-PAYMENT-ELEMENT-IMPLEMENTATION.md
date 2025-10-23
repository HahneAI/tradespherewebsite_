# Stripe Payment Element Implementation Guide

## Overview

This document describes the implementation of Stripe Payment Element with **built-in Plaid integration** for ACH bank account verification on the Tradesphere website.

**IMPORTANT**: Stripe Payment Element includes Plaid support automatically when configured for `us_bank_account` payments. No separate Plaid Link integration is needed.

## Architecture

### Old Approach (Removed)
- Manual bank account entry (routing number, account number)
- Dwolla for ACH payments
- Complex 3-step process

### New Approach (Current)
- **Stripe Payment Element** with built-in Plaid
- User clicks "Link bank account" → Plaid modal opens automatically
- Instant bank verification through Plaid
- Seamless Stripe subscription creation

## Implementation Files

### 1. Frontend Component
**File**: `src/components/OnboardingFlow.tsx`

**Key Changes**:
- Removed all manual bank entry fields (routing number, account number, account type)
- Added `@stripe/stripe-js` and `@stripe/react-stripe-js` imports
- Wrapped payment step with `<Elements>` provider
- Mounted `<PaymentElement>` configured for ACH only
- Added loading states and error handling

**Flow**:
```
1. User enters company info (email, name, owner name)
2. Component auto-calls create-subscription-setup endpoint
3. Backend returns client_secret
4. PaymentElement mounts with client_secret
5. User clicks "Link bank account"
6. Plaid modal opens (handled by Stripe)
7. User selects bank and authenticates
8. Plaid verifies account instantly
9. User confirms setup
10. Payment processes via ACH (3-5 days)
11. Webhook creates company when payment clears
```

### 2. Backend Functions

#### `create-subscription-setup.js`
**Purpose**: Create Stripe Subscription with SetupIntent

**Flow**:
1. Validate input (company info, subscription tier)
2. Check if Stripe customer exists (by email)
3. Create customer if needed
4. Create Stripe Subscription with `payment_behavior: 'default_incomplete'`
5. Configure for `us_bank_account` payment method only
6. Return `client_secret` for Payment Element

**Returns**:
```json
{
  "success": true,
  "clientSecret": "seti_xxx_secret_xxx",
  "intentType": "setup",
  "customerId": "cus_xxx",
  "subscriptionId": "sub_xxx",
  "publishableKey": "pk_test_xxx"
}
```

#### `process-initial-payment.js`
**Purpose**: Process first payment after bank verification

**DEPRECATED**: This function is no longer needed. Stripe subscriptions handle payments automatically via webhooks. Payment processing happens when the subscription's first invoice is paid.

**Note**: Can be removed or kept for manual payment scenarios.

#### `webhook-stripe.js`
**Purpose**: Handle Stripe webhook events

**Key Events**:
- `payment_intent.succeeded` - Payment cleared, create company
- `payment_intent.payment_failed` - Payment failed, notify user
- `invoice.paid` - Subscription invoice paid
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription status changed

### 3. Database Schema

**No changes required** to existing schema. Uses existing `payments` table:

```sql
-- payments table (existing)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_email TEXT NOT NULL,
  company_name TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'processing', 'succeeded', 'failed'
  payment_type TEXT, -- 'subscription_setup', 'initial_subscription'
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_subscription_id TEXT,
  ach_status TEXT, -- 'pending', 'cleared', 'failed'
  subscription_period_start DATE,
  subscription_period_end DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables Required

Add these to Netlify dashboard:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx  # Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Webhook signing secret

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_STARTER=price_xxx  # Starter plan price ID
STRIPE_PRICE_GROWTH=price_xxx   # Growth plan price ID ($299/month)
STRIPE_PRICE_ENTERPRISE=price_xxx  # Enterprise plan price ID

# Existing
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
FRONTEND_URL=https://yoursite.netlify.app
```

## Stripe Dashboard Setup

### 1. Create Products & Prices

Navigate to: **Products** → **Add product**

Create three products:

**Starter Plan**:
- Name: "Tradesphere Starter"
- Price: $99/month
- Billing: Recurring (monthly)
- Copy Price ID → Set as `STRIPE_PRICE_STARTER`

**Growth Plan**:
- Name: "Tradesphere Growth"
- Price: $299/month
- Billing: Recurring (monthly)
- Copy Price ID → Set as `STRIPE_PRICE_GROWTH`

**Enterprise Plan**:
- Name: "Tradesphere Enterprise"
- Price: $2000/month (or custom)
- Billing: Recurring (monthly)
- Copy Price ID → Set as `STRIPE_PRICE_ENTERPRISE`

### 2. Enable ACH Payments

Navigate to: **Settings** → **Payment methods**

Enable:
- [x] ACH Direct Debit (US bank accounts)
- [x] Link (Stripe's instant verification)

**Financial Connections** (Plaid):
- This is enabled automatically when you enable ACH
- No additional Plaid account needed
- Stripe handles the Plaid integration

### 3. Setup Webhooks

Navigate to: **Developers** → **Webhooks** → **Add endpoint**

**Endpoint URL**: `https://yoursite.netlify.app/.netlify/functions/webhook-stripe`

**Events to listen to**:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.processing`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.succeeded`
- `charge.failed`

Copy the **Signing secret** → Set as `STRIPE_WEBHOOK_SECRET`

## Payment Element Configuration

The Payment Element is configured to show **ACH bank account only**:

```jsx
<PaymentElement options={{
  layout: {
    type: 'tabs',
    defaultCollapsed: false,
  }
}} />
```

When user clicks "Link bank account", Stripe automatically:
1. Opens Plaid authentication modal
2. User searches for their bank
3. User logs in to their bank
4. Plaid verifies the account instantly
5. Account is linked to Stripe customer
6. Payment method saved for subscription

**No custom Plaid integration needed** - Stripe handles everything!

## Testing

### Test Mode Setup

1. Use Stripe test keys (`pk_test_xxx`, `sk_test_xxx`)
2. Use test bank accounts in Plaid
3. Test webhooks with Stripe CLI:

```bash
stripe listen --forward-to localhost:8888/.netlify/functions/webhook-stripe
```

### Test Bank Accounts (Plaid Sandbox)

When testing with Plaid in Stripe's test mode:

- Search for: "Platypus Bank" (or any Plaid test bank)
- Username: `user_good`
- Password: `pass_good`
- MFA: `1234`

### Test Payment Flow

1. Navigate to `/onboarding`
2. Click "Begin Setup Process"
3. Enter test company info:
   - Email: `test@example.com`
   - Company: `Test Company Inc.`
   - Owner: `John Doe`
4. Wait for Payment Element to load
5. Click "Link bank account"
6. Select "Platypus Bank" (Plaid test bank)
7. Login with test credentials
8. Confirm setup
9. Check Stripe Dashboard for subscription

### Expected Webhook Flow

1. `customer.subscription.created` - Subscription created
2. `payment_intent.processing` - ACH payment initiated
3. (3-5 days later) `payment_intent.succeeded` - Payment cleared
4. `invoice.paid` - First invoice paid
5. Company creation triggered

## Security Considerations

### Built-in Security Features

1. **Stripe handles bank credentials** - Never exposed to your servers
2. **Plaid handles authentication** - Bank-level security
3. **Webhook signature verification** - Prevents spoofing
4. **PCI compliance** - Stripe is PCI DSS Level 1 certified
5. **No manual bank account entry** - Reduces data exposure

### Implementation Security

- ✅ Webhook signature verification in `webhook-stripe.js`
- ✅ Input validation with Zod schemas
- ✅ HTTPS only in production
- ✅ Environment variables for secrets
- ✅ RLS policies on database
- ✅ Service key usage limited to backend functions

## Troubleshooting

### Payment Element Not Loading

**Symptoms**: Spinner shows indefinitely

**Fixes**:
1. Check `STRIPE_PUBLISHABLE_KEY` is set correctly
2. Check `create-subscription-setup` function returns `clientSecret`
3. Check browser console for Stripe.js errors
4. Verify Stripe.js is loaded: `window.Stripe` should exist

### Plaid Modal Not Opening

**Symptoms**: "Link bank account" does nothing

**Fixes**:
1. Verify ACH is enabled in Stripe Dashboard
2. Check Stripe account is verified (not restricted)
3. Test in Stripe test mode first
4. Check Payment Element options include `us_bank_account`

### Webhook Not Firing

**Symptoms**: Payment succeeds but company not created

**Fixes**:
1. Check webhook endpoint URL is correct
2. Verify webhook secret (`STRIPE_WEBHOOK_SECRET`)
3. Check Netlify function logs for errors
4. Test with Stripe CLI: `stripe trigger payment_intent.succeeded`
5. Verify webhook events are selected in Stripe Dashboard

### Database Errors

**Symptoms**: Payment succeeds but database insert fails

**Fixes**:
1. Verify `SUPABASE_SERVICE_KEY` has admin access
2. Check database table exists: `payments`
3. Check RLS policies allow service key access
4. Review Supabase logs for SQL errors

## Migration from Old System

If you have existing Dwolla integration:

1. **Keep old functions** for reference:
   - `create-dwolla-customer.js.old`
   - `process-payment.js.old`
   - `webhook-dwolla.js.old`

2. **Update environment variables**:
   - Add Stripe variables
   - Keep Dwolla variables (for historical data)

3. **Database migration**:
   - Existing `payments` table works as-is
   - Add `stripe_subscription_id` column if missing

4. **User communication**:
   - Notify existing customers of new payment method
   - Provide migration path for updating payment details

## Benefits Over Old System

### User Experience
- ✅ **Instant verification** (vs micro-deposits)
- ✅ **No manual entry** (reduces errors)
- ✅ **Trusted UI** (Plaid modal familiar to users)
- ✅ **Mobile-friendly** (responsive Stripe components)

### Developer Experience
- ✅ **Less code** (Stripe handles complexity)
- ✅ **Better debugging** (Stripe Dashboard tools)
- ✅ **Automatic updates** (Stripe maintains Plaid integration)
- ✅ **Comprehensive docs** (Stripe documentation)

### Business Benefits
- ✅ **Lower fees** (ACH vs credit cards)
- ✅ **Higher conversion** (easier signup)
- ✅ **Better security** (Stripe + Plaid compliance)
- ✅ **Recurring revenue** (subscription model)

## Next Steps

1. **Test thoroughly** in Stripe test mode
2. **Set up production** Stripe account
3. **Create production prices** in Stripe Dashboard
4. **Configure production webhooks**
5. **Update environment variables** to production keys
6. **Monitor webhook logs** after launch
7. **Set up Stripe notifications** for failed payments

## Support Resources

- [Stripe Payment Element Docs](https://stripe.com/docs/payments/payment-element)
- [Stripe ACH Payments Docs](https://stripe.com/docs/payments/ach-direct-debit)
- [Stripe Subscriptions Docs](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Financial Connections (Plaid)](https://stripe.com/docs/payments/ach-direct-debit/set-up-payment)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

## Conclusion

The Stripe Payment Element implementation provides a modern, secure, and user-friendly payment experience with minimal code. The built-in Plaid integration eliminates the need for manual bank account entry and provides instant verification, significantly improving conversion rates and user experience.
