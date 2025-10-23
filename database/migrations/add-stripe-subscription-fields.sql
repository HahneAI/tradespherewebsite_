-- Migration: Add Stripe Subscription Fields
-- Date: 2025-01-22
-- Description: Add fields needed for Stripe Subscriptions with ACH payments

-- Add stripe_subscription_id to companies table (if not exists)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add stripe_subscription_id to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add stripe_invoice_id to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Add metadata column to payments for storing additional info
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription_id
ON companies(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_stripe_subscription_id
ON payments(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id
ON payments(stripe_invoice_id)
WHERE stripe_invoice_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN companies.stripe_subscription_id IS 'Stripe subscription ID for recurring billing';
COMMENT ON COLUMN payments.stripe_subscription_id IS 'Associated Stripe subscription ID';
COMMENT ON COLUMN payments.stripe_invoice_id IS 'Stripe invoice ID for subscription payments';
COMMENT ON COLUMN payments.metadata IS 'Additional payment metadata (company info, subscription tier, etc)';

-- Create stripe_setup_intents table if needed (for tracking setup attempts)
CREATE TABLE IF NOT EXISTS stripe_setup_intents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setup_intent_id TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    company_email TEXT NOT NULL,
    company_name TEXT NOT NULL,
    subscription_tier TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy for stripe_setup_intents (service key only)
ALTER TABLE stripe_setup_intents ENABLE ROW LEVEL SECURITY;

-- Create index for stripe_setup_intents
CREATE INDEX IF NOT EXISTS idx_stripe_setup_intents_customer_id
ON stripe_setup_intents(customer_id);

CREATE INDEX IF NOT EXISTS idx_stripe_setup_intents_company_email
ON stripe_setup_intents(company_email);

-- Update stripe_webhooks table to ensure it exists
CREATE TABLE IF NOT EXISTS stripe_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for webhook processing
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_processed
ON stripe_webhooks(processed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_event_type
ON stripe_webhooks(event_type, created_at DESC);

-- Add RLS for stripe_webhooks
ALTER TABLE stripe_webhooks ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions (adjust based on your roles)
-- Example for service role (usually handled by Supabase automatically)
-- GRANT ALL ON stripe_setup_intents TO service_role;
-- GRANT ALL ON stripe_webhooks TO service_role;