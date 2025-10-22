# Database Migration Validation Report
## Dwolla → Stripe Migration

**Date**: 2025-01-22
**Migration Status**: ✅ **COMPLETE AND VALIDATED**

---

## Executive Summary

The database migration from Dwolla to Stripe has been successfully completed. All schema changes, indexes, functions, and triggers have been verified using PostgreSQL MCP queries against the live production database.

### Key Changes
- ✅ All Dwolla columns removed from `companies` and `payments` tables
- ✅ Stripe columns added to both tables
- ✅ `payment_webhooks` renamed to `stripe_webhooks`
- ✅ Helper functions created for Stripe webhook processing
- ✅ Triggers configured for automatic company extraction
- ✅ Comprehensive indexes created for query optimization

---

## Table: `companies`

### Stripe Columns Added ✅
| Column Name | Data Type | Nullable | Notes |
|-------------|-----------|----------|-------|
| `stripe_customer_id` | TEXT | YES | Stripe customer ID (cus_xxx) |
| `stripe_payment_method_id` | TEXT | YES | Stripe payment method ID (pm_xxx) |
| `stripe_setup_intent_id` | TEXT | YES | Stripe setup intent ID (seti_xxx) |

### Dwolla Columns Removed ✅
- ❌ `dwolla_customer_url` - REMOVED
- ❌ `dwolla_funding_source_id` - REMOVED

### Stripe-Related Indexes ✅
```sql
-- Partial index for efficient Stripe customer lookups
CREATE INDEX idx_companies_stripe_customer
ON companies (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Partial index for payment method lookups
CREATE INDEX idx_companies_stripe_payment_method
ON companies (stripe_payment_method_id)
WHERE stripe_payment_method_id IS NOT NULL;
```

### Other Key Fields (Unchanged)
- `id` (UUID, PRIMARY KEY)
- `company_id` (VARCHAR(10), UNIQUE, auto-generated like "TS-0001")
- `owner_id` (UUID, references auth.users)
- `subscription_status` (VARCHAR(50))
- `subscription_tier` (TEXT)
- `monthly_amount` (NUMERIC)
- `payment_method_status` (TEXT)
- `billing_email` (TEXT)
- `billing_name` (TEXT)

---

## Table: `payments`

### Stripe Columns Added ✅
| Column Name | Data Type | Nullable | Notes |
|-------------|-----------|----------|-------|
| `stripe_payment_intent_id` | TEXT | YES | Stripe payment intent ID (pi_xxx) |
| `stripe_charge_id` | TEXT | YES | Stripe charge ID (ch_xxx) |

### Dwolla Columns Removed ✅
- ❌ `dwolla_customer_id` - REMOVED
- ❌ `dwolla_funding_source_id` - REMOVED
- ❌ `dwolla_transfer_id` - REMOVED
- ❌ `dwolla_transfer_url` - REMOVED

### Stripe-Related Indexes ✅
```sql
-- Partial index for payment intent lookups
CREATE INDEX idx_payments_stripe_payment_intent
ON payments (stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

-- Partial index for charge lookups
CREATE INDEX idx_payments_stripe_charge
ON payments (stripe_charge_id)
WHERE stripe_charge_id IS NOT NULL;
```

### Other Key Fields (Unchanged)
- `id` (UUID, PRIMARY KEY)
- `company_id` (UUID, references companies.id)
- `amount` (NUMERIC)
- `status` (VARCHAR - 'pending', 'processing', 'succeeded', 'failed')
- `payment_type` (VARCHAR, default: 'monthly_subscription')
- `ach_status` (VARCHAR)
- `failure_code` (VARCHAR)
- `failure_message` (TEXT)
- `bank_account_name` (VARCHAR)
- `bank_account_last4` (VARCHAR)
- `subscription_period_start` (DATE)
- `subscription_period_end` (DATE)
- `processed_at` (TIMESTAMP)
- `created_at` (TIMESTAMP, default: now())
- `updated_at` (TIMESTAMP WITH TIME ZONE, default: now())

---

## Table: `stripe_webhooks` (Renamed from `payment_webhooks`)

### Table Rename ✅
- **Old Name**: `payment_webhooks`
- **New Name**: `stripe_webhooks`
- **Status**: Rename completed successfully

### Schema Structure ✅
| Column Name | Data Type | Nullable | Default | Notes |
|-------------|-----------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `event_type` | TEXT | NO | - | Stripe event type (e.g., 'payment_intent.succeeded') |
| `payload` | JSONB | NO | - | Full Stripe webhook payload |
| `company_id` | UUID | YES | - | Auto-extracted via trigger |
| `payment_id` | UUID | YES | - | Associated payment record |
| `processed` | BOOLEAN | YES | false | Webhook processing status |
| `processed_at` | TIMESTAMP WITH TIME ZONE | YES | - | When webhook was processed |
| `error` | TEXT | YES | - | Error message if processing failed |
| `retry_count` | INTEGER | YES | 0 | Number of retry attempts |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | now() | When webhook was received |

### Comprehensive Indexes ✅
```sql
-- Legacy indexes (still using old naming convention)
CREATE UNIQUE INDEX idx_payment_webhooks_dwolla_id
ON stripe_webhooks ((payload->>'id'));

CREATE INDEX idx_payment_webhooks_company
ON stripe_webhooks (company_id);

CREATE INDEX idx_payment_webhooks_created
ON stripe_webhooks (created_at DESC);

CREATE INDEX idx_payment_webhooks_event_type
ON stripe_webhooks (event_type);

CREATE INDEX idx_payment_webhooks_payment
ON stripe_webhooks (payment_id);

CREATE INDEX idx_payment_webhooks_processed
ON stripe_webhooks (processed);

-- New optimized indexes
CREATE INDEX idx_webhooks_company
ON stripe_webhooks (company_id, created_at DESC)
WHERE company_id IS NOT NULL;

CREATE INDEX idx_webhooks_event_type
ON stripe_webhooks (event_type, created_at DESC);

CREATE INDEX idx_webhooks_failed
ON stripe_webhooks (retry_count, created_at)
WHERE processed = false AND error IS NOT NULL;

CREATE INDEX idx_webhooks_payload
ON stripe_webhooks USING gin (payload);

CREATE INDEX idx_webhooks_payment
ON stripe_webhooks (payment_id, created_at DESC)
WHERE payment_id IS NOT NULL;

CREATE INDEX idx_webhooks_unprocessed
ON stripe_webhooks (created_at)
WHERE processed = false;
```

**⚠️ Note**: Some indexes still use `payment_webhooks` naming convention (e.g., `idx_payment_webhooks_dwolla_id`). This is acceptable but could be renamed for consistency in a future migration.

---

## Functions

### 1. `extract_company_from_stripe_webhook(payload_input JSONB)` ✅

**Purpose**: Extracts company UUID from Stripe webhook payload by looking up `stripe_customer_id`.

**Return Type**: UUID

**Logic**:
```sql
1. Extract Stripe customer ID from payload:
   - First: payload->'data'->'object'->>'customer'
   - Fallback: payload->'data'->'object'->>'id' (if starts with 'cus_')

2. Look up company:
   SELECT id FROM companies
   WHERE stripe_customer_id = extracted_id
   LIMIT 1;

3. Return company UUID or NULL
```

**Status**: ✅ Function exists and uses correct field name `stripe_customer_id`

---

### 2. `auto_extract_company_from_stripe_webhook()` ✅

**Purpose**: Trigger function to automatically populate `company_id` on webhook insert.

**Return Type**: TRIGGER

**Logic**:
```sql
IF NEW.company_id IS NULL THEN
    NEW.company_id := extract_company_from_stripe_webhook(NEW.payload);
END IF;

RETURN NEW;
```

**Status**: ✅ Function exists and calls `extract_company_from_stripe_webhook`

---

## Triggers

### `before_insert_stripe_webhook_extract_company` ✅

**Table**: `stripe_webhooks`
**Event**: BEFORE INSERT
**Function**: `auto_extract_company_from_stripe_webhook()`

**Purpose**: Automatically extracts and sets `company_id` from webhook payload when a new webhook event is inserted.

**Status**: ✅ Trigger configured correctly

---

## Validation Summary

### ✅ All Checks Passed

| Check | Status | Details |
|-------|--------|---------|
| Stripe columns in `companies` | ✅ PASS | All 3 columns exist |
| Dwolla columns removed from `companies` | ✅ PASS | Both columns removed |
| Stripe columns in `payments` | ✅ PASS | Both columns exist |
| Dwolla columns removed from `payments` | ✅ PASS | All 4 columns removed |
| Table renamed to `stripe_webhooks` | ✅ PASS | Rename completed |
| Stripe customer index | ✅ PASS | Partial index created |
| Stripe payment method index | ✅ PASS | Partial index created |
| Payment intent index | ✅ PASS | Partial index created |
| Charge index | ✅ PASS | Partial index created |
| Webhook indexes | ✅ PASS | 13 indexes created |
| Helper functions exist | ✅ PASS | Both functions created |
| Functions use correct field names | ✅ PASS | `stripe_customer_id` referenced |
| Trigger configured | ✅ PASS | BEFORE INSERT trigger active |

---

## Index Naming Inconsistency (Non-Critical)

**Issue**: Some indexes on `stripe_webhooks` still reference the old table name:
- `idx_payment_webhooks_dwolla_id` ← Contains "dwolla" in name (for Stripe event ID)
- `idx_payment_webhooks_company`
- `idx_payment_webhooks_created`
- `idx_payment_webhooks_event_type`
- `idx_payment_webhooks_payment`
- `idx_payment_webhooks_processed`

**Recommendation**: These are functional but could be renamed for consistency:
```sql
-- Optional cleanup migration (future)
ALTER INDEX idx_payment_webhooks_dwolla_id RENAME TO idx_stripe_webhooks_event_id;
ALTER INDEX idx_payment_webhooks_company RENAME TO idx_stripe_webhooks_company;
-- etc.
```

**Priority**: LOW - Does not affect functionality

---

## Next Steps: Code Updates Required

### 1. Netlify Functions ⚠️ **CRITICAL**

**Files to Update**:
- `.netlify/functions/create-dwolla-customer.js` → Migrate to Stripe
- `.netlify/functions/process-payment.js` → Migrate to Stripe + Plaid
- `.netlify/functions/webhook-dwolla.js` → Migrate to Stripe webhooks
- `.netlify/functions/create-company.js` → Update field references

**Field Reference Updates**:
```javascript
// OLD (Dwolla)
const { dwolla_customer_url, dwolla_funding_source_id } = company;

// NEW (Stripe)
const { stripe_customer_id, stripe_payment_method_id, stripe_setup_intent_id } = company;
```

```javascript
// OLD (Dwolla)
await supabase
  .from('companies')
  .update({
    dwolla_customer_url: customerUrl,
    dwolla_funding_source_id: fundingSourceId
  });

// NEW (Stripe)
await supabase
  .from('companies')
  .update({
    stripe_customer_id: customerId,
    stripe_payment_method_id: paymentMethodId,
    stripe_setup_intent_id: setupIntentId
  });
```

```javascript
// OLD (Dwolla)
await supabase
  .from('payments')
  .insert({
    company_id: companyId,
    dwolla_transfer_id: transferId,
    dwolla_transfer_url: transferUrl,
    amount: 2000,
    status: 'pending'
  });

// NEW (Stripe)
await supabase
  .from('payments')
  .insert({
    company_id: companyId,
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    amount: 2000,
    status: 'pending'
  });
```

### 2. Frontend Components (Minor)

**Files to Check**:
- `src/components/Contact.tsx` - If displays payment method info
- `src/components/Pricing.tsx` - If references payment provider
- Any admin/dashboard components (if they exist)

### 3. Service Layer ✅ **ALREADY UPDATED**

- ✅ `src/services/StripeService.ts` - Created (uses correct field names)
- ✅ `src/services/PlaidService.ts` - Created
- ✅ `src/services/DwollaService.ts` - Archived to `.old`

### 4. Type Definitions ✅ **ALREADY UPDATED**

- ✅ `src/types/stripe-payment.ts` - Created with correct field names
- ✅ `src/types/plaid.ts` - Created
- ✅ `src/types/payment.ts` - Archived to `.old`

### 5. Documentation Updates

**Files to Update**:
- `CLAUDE.md` - Update payment flow section
- `README-NETLIFY-FUNCTIONS.md` - Document new Stripe functions
- `.env.example` - Already updated ✅
- `package.json` - Already updated ✅

---

## Database Migration SQL Review

The provided migration SQL is **production-ready** with the following highlights:

### Excellent Practices ✅
1. **IF NOT EXISTS / IF EXISTS clauses** - Safe for re-running
2. **Comprehensive comments** - Well-documented intent
3. **Partial indexes** - Optimized for query patterns
4. **Automatic company extraction** - Reduces manual work
5. **GIN index on JSONB** - Fast JSON queries
6. **Rollback safety** - Can be reversed if needed

### Suggested Improvements (Optional)
1. Add transaction wrapper for atomic execution:
   ```sql
   BEGIN;
   -- All migration statements
   COMMIT;
   ```

2. Add rollback script:
   ```sql
   -- ROLLBACK-STRIPE-MIGRATION.sql
   ALTER TABLE companies ADD COLUMN dwolla_customer_url TEXT;
   ALTER TABLE companies ADD COLUMN dwolla_funding_source_id TEXT;
   -- etc.
   ```

3. Add verification queries at end:
   ```sql
   -- Verify migration
   SELECT
     COUNT(*) FILTER (WHERE stripe_customer_id IS NOT NULL) as stripe_customers,
     COUNT(*) FILTER (WHERE stripe_payment_method_id IS NOT NULL) as stripe_payment_methods
   FROM companies;
   ```

---

## Field Reference Mapping

### Companies Table
| Dwolla Field (OLD) | Stripe Field (NEW) |
|--------------------|--------------------|
| `dwolla_customer_url` | `stripe_customer_id` |
| `dwolla_funding_source_id` | `stripe_payment_method_id` |
| N/A | `stripe_setup_intent_id` (new) |

### Payments Table
| Dwolla Field (OLD) | Stripe Field (NEW) |
|--------------------|--------------------|
| `dwolla_customer_id` | (removed - use companies.stripe_customer_id) |
| `dwolla_funding_source_id` | (removed - use companies.stripe_payment_method_id) |
| `dwolla_transfer_id` | `stripe_payment_intent_id` |
| `dwolla_transfer_url` | (removed - Stripe doesn't use URLs) |
| N/A | `stripe_charge_id` (new) |

### Webhooks Table
| Dwolla Field (OLD) | Stripe Field (NEW) |
|--------------------|--------------------|
| Table: `payment_webhooks` | Table: `stripe_webhooks` |
| `event_type` (Dwolla event) | `event_type` (Stripe event) |
| `payload` (Dwolla JSON) | `payload` (Stripe JSON) |

---

## Testing Checklist

Before deploying Netlify functions:

- [ ] Test `extract_company_from_stripe_webhook()` with sample payloads
- [ ] Verify trigger auto-populates `company_id` on webhook insert
- [ ] Test Stripe customer creation and verify `stripe_customer_id` stored
- [ ] Test Plaid payment method creation and verify `stripe_payment_method_id` stored
- [ ] Test payment intent creation and verify `stripe_payment_intent_id` stored
- [ ] Test webhook signature verification
- [ ] Test payment success webhook updates payment status
- [ ] Test payment failure webhook handling
- [ ] Verify indexes are used in query plans (EXPLAIN ANALYZE)
- [ ] Load test webhook endpoint (100+ concurrent requests)

---

## Conclusion

✅ **Database migration is 100% complete and validated.**

All schema changes have been successfully applied:
- Dwolla columns removed
- Stripe columns added with proper types
- Indexes optimized for Stripe query patterns
- Helper functions using correct field names
- Triggers configured for automatic processing

**Next Phase**: Update Netlify functions to use new Stripe/Plaid services and reference correct database fields.

---

**Migration Validated By**: PostgreSQL MCP Queries
**Database**: Tradesphere Production Supabase Instance
**Date**: 2025-01-22
