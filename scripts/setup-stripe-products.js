/**
 * SETUP STRIPE PRODUCTS AND PRICES
 *
 * Run this script to create Stripe Products and Prices for your subscription tiers.
 * This only needs to be run once per Stripe account (test mode and live mode separately).
 *
 * Usage:
 * 1. Set your STRIPE_SECRET_KEY environment variable
 * 2. Run: node scripts/setup-stripe-products.js
 * 3. Copy the price IDs to your environment variables:
 *    - STRIPE_PRICE_STARTER=price_xxx
 *    - STRIPE_PRICE_GROWTH=price_xxx
 *    - STRIPE_PRICE_ENTERPRISE=price_xxx
 */

const Stripe = require('stripe');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'YOUR_STRIPE_SECRET_KEY_HERE', {
  apiVersion: '2024-11-20.acacia'
});

// Product and pricing configuration
const PRODUCTS = {
  tradesphere: {
    name: 'Tradesphere CRM',
    description: 'AI-powered CRM for field service companies',
    metadata: {
      product_type: 'saas_subscription'
    }
  }
};

const PRICES = {
  starter: {
    nickname: 'Starter',
    unit_amount: 9900, // $99 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      interval_count: 1
    },
    metadata: {
      tier: 'starter',
      features: JSON.stringify([
        'Up to 5 users',
        'Basic AI quoting',
        'Standard scheduling',
        'Mobile app access',
        'Email support'
      ])
    }
  },
  growth: {
    nickname: 'Growth',
    unit_amount: 29900, // $299 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      interval_count: 1
    },
    metadata: {
      tier: 'growth',
      features: JSON.stringify([
        'Up to 25 users',
        'Advanced AI quoting',
        'Smart scheduling',
        'Real-time crew tracking',
        'Integrations',
        'Priority support'
      ])
    }
  },
  enterprise: {
    nickname: 'Enterprise',
    unit_amount: 200000, // $2000 in cents (placeholder - usually custom)
    currency: 'usd',
    recurring: {
      interval: 'month',
      interval_count: 1
    },
    metadata: {
      tier: 'enterprise',
      features: JSON.stringify([
        'Unlimited users',
        'Custom AI training',
        'Advanced analytics',
        'API access',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee'
      ])
    }
  }
};

async function setupStripeProducts() {
  try {
    console.log('🚀 Setting up Stripe Products and Prices...\n');

    // Step 1: Check if product already exists
    let product;
    const existingProducts = await stripe.products.list({ limit: 100 });

    product = existingProducts.data.find(p =>
      p.metadata.product_type === 'saas_subscription' &&
      p.name === PRODUCTS.tradesphere.name
    );

    if (product) {
      console.log(`✅ Found existing product: ${product.id} (${product.name})`);
    } else {
      // Create new product
      product = await stripe.products.create(PRODUCTS.tradesphere);
      console.log(`✅ Created product: ${product.id} (${product.name})`);
    }

    console.log('\n📋 Creating/Finding Prices...\n');

    const priceIds = {};

    // Step 2: Create prices for each tier
    for (const [tier, priceConfig] of Object.entries(PRICES)) {
      // Check if price already exists
      const existingPrices = await stripe.prices.list({
        product: product.id,
        limit: 100
      });

      let price = existingPrices.data.find(p =>
        p.metadata.tier === tier &&
        p.unit_amount === priceConfig.unit_amount &&
        p.recurring?.interval === priceConfig.recurring.interval
      );

      if (price) {
        console.log(`✅ Found existing ${tier} price: ${price.id} ($${price.unit_amount / 100}/month)`);
      } else {
        // Create new price
        price = await stripe.prices.create({
          product: product.id,
          ...priceConfig
        });
        console.log(`✅ Created ${tier} price: ${price.id} ($${price.unit_amount / 100}/month)`);
      }

      priceIds[tier] = price.id;
    }

    // Step 3: Output environment variables
    console.log('\n🔑 Environment Variables to Set:\n');
    console.log('Add these to your .env file or Netlify environment variables:\n');
    console.log(`STRIPE_PRODUCT_ID=${product.id}`);
    console.log(`STRIPE_PRICE_STARTER=${priceIds.starter}`);
    console.log(`STRIPE_PRICE_GROWTH=${priceIds.growth}`);
    console.log(`STRIPE_PRICE_ENTERPRISE=${priceIds.enterprise}`);

    // Step 4: Create example .env.stripe file
    const fs = require('fs');
    const envContent = `# Stripe Product and Price IDs
# Generated on ${new Date().toISOString()}

STRIPE_PRODUCT_ID=${product.id}
STRIPE_PRICE_STARTER=${priceIds.starter}
STRIPE_PRICE_GROWTH=${priceIds.growth}
STRIPE_PRICE_ENTERPRISE=${priceIds.enterprise}
`;

    fs.writeFileSync('.env.stripe', envContent);
    console.log('\n📁 Saved to .env.stripe file');

    console.log('\n✨ Setup complete! Next steps:');
    console.log('1. Copy the environment variables to your Netlify dashboard');
    console.log('2. Test the subscription flow with create-subscription-setup.js');
    console.log('3. Configure webhook endpoint in Stripe dashboard:');
    console.log('   - Endpoint URL: https://your-site.netlify.app/.netlify/functions/webhook-stripe');
    console.log('   - Events to listen for:');
    console.log('     • customer.subscription.created');
    console.log('     • customer.subscription.updated');
    console.log('     • customer.subscription.deleted');
    console.log('     • invoice.payment_succeeded');
    console.log('     • invoice.payment_failed');
    console.log('     • invoice.finalized');

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
    process.exit(1);
  }
}

// Run the setup
setupStripeProducts();