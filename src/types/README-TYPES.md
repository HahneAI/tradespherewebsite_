# Stripe + Plaid Type Definitions

This directory contains comprehensive TypeScript type definitions for the Stripe ACH and Plaid integration.

## Files

### 1. `stripe-payment.ts`
Complete type definitions for Stripe payment processing:
- Customer management
- Payment methods (ACH bank accounts)
- Payment intents (one-time payments)
- Subscriptions (recurring billing)
- Webhook events
- Error handling
- Utility functions and type guards

### 2. `plaid.ts`
Complete type definitions for Plaid bank verification:
- Link token creation
- Public token exchange
- Processor token creation
- Account information
- Institution data
- Webhook events
- Error handling
- Validation helpers

## Usage Examples

### Frontend: Plaid Link Integration

```typescript
import {
  PlaidLinkConfig,
  PlaidLinkSuccessMetadata,
  PlaidLinkError
} from '@/types/plaid';

const config: PlaidLinkConfig = {
  token: linkToken,
  onSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
    console.log('Bank connected:', metadata.institution.name);
    console.log('Account:', metadata.accounts[0].name);

    // Send to backend
    await processSignup(publicToken, metadata.accounts[0].id);
  },
  onExit: (error: PlaidLinkError | null, metadata) => {
    if (error) {
      console.error('Link failed:', error.display_message);
    }
  }
};

const { open, ready } = usePlaidLink(config);
```

### Backend: Customer Creation

```typescript
import {
  CreateStripeCustomerParams,
  CreateStripeCustomerResponse,
  StripeServiceResponse
} from '@/types/stripe-payment';

const params: CreateStripeCustomerParams = {
  email: 'owner@company.com',
  companyName: 'Acme Landscaping',
  ownerName: 'John Smith',
  metadata: {
    signup_source: 'website',
    plan_type: 'growth'
  }
};

const result: StripeServiceResponse<CreateStripeCustomerResponse> =
  await stripeService.createCustomer(params);

if (result.success) {
  console.log('Customer ID:', result.data.customerId);
} else {
  console.error('Error:', result.error?.userMessage);
}
```

### Backend: Payment Processing

```typescript
import {
  CreateStripePaymentParams,
  CreateStripePaymentResponse,
  dollarsToCents,
  validatePaymentAmount
} from '@/types/stripe-payment';

// Validate amount
validatePaymentAmount(299.99);

const params: CreateStripePaymentParams = {
  customerId: 'cus_xxx',
  paymentMethodId: 'pm_xxx',
  amount: 299.99,
  companyId: 'uuid-here',
  companyName: 'Acme Landscaping',
  description: 'Monthly subscription - January 2025',
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  metadata: {
    billing_period: '2025-01'
  }
};

const result: StripeServiceResponse<CreateStripePaymentResponse> =
  await stripeService.createPayment(params);

if (result.success) {
  console.log('Payment ID:', result.data.paymentIntentId);
  console.log('Status:', result.data.status);
}
```

### Backend: Webhook Handling

```typescript
import {
  StripeWebhookEvent,
  StripePaymentIntent,
  isSuccessfulPaymentStatus
} from '@/types/stripe-payment';

async function handlePaymentSucceeded(event: StripeWebhookEvent<StripePaymentIntent>) {
  const paymentIntent = event.data.object;

  console.log('Payment succeeded:', paymentIntent.id);
  console.log('Amount:', paymentIntent.amount / 100); // Convert cents to dollars
  console.log('Customer:', paymentIntent.customer);

  if (isSuccessfulPaymentStatus(paymentIntent.status)) {
    // Create company and user accounts
    await createCompany(paymentIntent);
  }
}
```

### Type Guards and Validators

```typescript
import {
  isSuccessfulPaymentStatus,
  isFinalPaymentStatus,
  isActiveSubscription,
  isRetryableStripeError,
  isACHPaymentMethod
} from '@/types/stripe-payment';

import {
  isDepositoryAccount,
  isVerifiedAccount,
  isRetryablePlaidError,
  requiresUserAction
} from '@/types/plaid';

// Check payment status
if (isSuccessfulPaymentStatus(payment.status)) {
  // Payment completed
}

// Check if error is retryable
if (isRetryableStripeError(error)) {
  // Retry payment
}

// Check account type
if (isDepositoryAccount(account) && isVerifiedAccount(account)) {
  // Can use for ACH
}

// Check if user action needed
if (requiresUserAction(plaidError)) {
  // Prompt user to reconnect bank
}
```

### Helper Functions

```typescript
import {
  dollarsToCents,
  centsToDollars,
  formatAmount,
  validatePaymentAmount
} from '@/types/stripe-payment';

import {
  getUserFriendlyErrorMessage,
  validatePublicToken,
  validateAccessToken,
  isLinkTokenExpired,
  formatAccountMask,
  getAccountDisplayName
} from '@/types/plaid';

// Currency conversion
const cents = dollarsToCents(299.99); // 29999
const dollars = centsToDollars(29999); // 299.99
const formatted = formatAmount(299.99); // "$299.99"

// Validation
validatePaymentAmount(299.99); // Throws if invalid
validatePublicToken('public-sandbox-xxx'); // Throws if invalid

// Error messages
const userMessage = getUserFriendlyErrorMessage(plaidError);
// Returns: "Please log in to your bank account again to continue."

// Account display
const displayName = getAccountDisplayName(account, 'Chase');
// Returns: "Chase Checking ****1234"
```

## Security Best Practices

### Never Expose Sensitive Data

```typescript
import { PlaidItemRecord } from '@/types/plaid';

// ❌ WRONG: Storing plaintext access token
const badRecord: PlaidItemRecord = {
  encrypted_access_token: plaidAccessToken, // NEVER DO THIS
  // ... other fields
};

// ✅ CORRECT: Encrypt before storage
import { TokenEncryption } from '@/utils/encryption';

const goodRecord: PlaidItemRecord = {
  encrypted_access_token: TokenEncryption.encrypt(plaidAccessToken),
  // ... other fields
};
```

### Validate All User Input

```typescript
import { validatePaymentAmount, validatePublicToken } from '@/types/stripe-payment';
import { validateAccountId } from '@/types/plaid';

try {
  validatePaymentAmount(amount);
  validatePublicToken(publicToken);
  validateAccountId(accountId);

  // Proceed with payment
} catch (error) {
  return { success: false, error: error.message };
}
```

### Handle Errors Gracefully

```typescript
import {
  StripeServiceResponse,
  StripeServiceError,
  isRetryableStripeError
} from '@/types/stripe-payment';

const result: StripeServiceResponse<T> = await someOperation();

if (!result.success && result.error) {
  const error: StripeServiceError = result.error;

  // Log full error for debugging
  console.error('Operation failed:', error.message);

  // Show user-friendly message to user
  alert(error.userMessage);

  // Retry if applicable
  if (error.retryable) {
    await retryOperation();
  }
}
```

## Common Patterns

### Complete Signup Flow

```typescript
import {
  CreatePlaidLinkTokenParams,
  ExchangePublicTokenParams,
  CreateProcessorTokenParams
} from '@/types/plaid';

import {
  CreateStripeCustomerParams,
  CreateStripePaymentMethodParams,
  CreateStripePaymentParams
} from '@/types/stripe-payment';

// 1. Create Plaid Link token
const linkParams: CreatePlaidLinkTokenParams = {
  userId: 'temp-user-id',
  companyName: formData.companyName
};

const linkTokenResult = await plaidService.createLinkToken(linkParams);

// 2. User connects bank via Plaid Link (frontend)

// 3. Exchange public token
const exchangeParams: ExchangePublicTokenParams = {
  publicToken: publicToken,
  accountId: accountId
};

const tokenResult = await plaidService.exchangePublicToken(exchangeParams);

// 4. Create processor token
const processorParams: CreateProcessorTokenParams = {
  accessToken: tokenResult.data.accessToken,
  accountId: accountId
};

const processorResult = await plaidService.createProcessorToken(processorParams);

// 5. Create Stripe customer
const customerParams: CreateStripeCustomerParams = {
  email: formData.email,
  companyName: formData.companyName,
  ownerName: formData.ownerName
};

const customerResult = await stripeService.createCustomer(customerParams);

// 6. Create payment method
const paymentMethodParams: CreateStripePaymentMethodParams = {
  customerId: customerResult.data.customerId,
  processorToken: processorResult.data.processorToken,
  setAsDefault: true
};

const paymentMethodResult = await stripeService.createPaymentMethod(paymentMethodParams);

// 7. Create payment
const paymentParams: CreateStripePaymentParams = {
  customerId: customerResult.data.customerId,
  paymentMethodId: paymentMethodResult.data.paymentMethodId,
  amount: 299.99,
  companyId: companyId,
  companyName: formData.companyName,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
};

const paymentResult = await stripeService.createPayment(paymentParams);

// 8. Return result
return {
  success: true,
  data: {
    customerId: customerResult.data.customerId,
    paymentIntentId: paymentResult.data.paymentIntentId,
    status: paymentResult.data.status
  }
};
```

## Type Safety Benefits

These type definitions provide:

1. **Compile-time safety**: Catch errors before runtime
2. **IntelliSense support**: Auto-completion in IDEs
3. **Documentation**: JSDoc comments explain each field
4. **Validation**: Helper functions ensure data integrity
5. **Consistency**: Same types across frontend and backend
6. **Security**: Clear marking of sensitive fields
7. **Maintainability**: Centralized type definitions

## Migration from Dwolla

When migrating from `src/types/payment.ts` (Dwolla types):

```typescript
// Old (Dwolla)
import { CreateCustomerParams } from '@/types/payment';

// New (Stripe + Plaid)
import { CreateStripeCustomerParams } from '@/types/stripe-payment';
import { CreatePlaidLinkTokenParams } from '@/types/plaid';
```

## Contributing

When adding new types:

1. Add comprehensive JSDoc comments
2. Include usage examples in comments
3. Add type guards if applicable
4. Add validation helpers if needed
5. Update this README with examples

## References

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Plaid API Documentation](https://plaid.com/docs/api/)
- [STRIPE-PLAID-ARCHITECTURE.md](../../../STRIPE-PLAID-ARCHITECTURE.md)
- [SECURITY-AUDIT-STRIPE-PLAID.md](../../../SECURITY-AUDIT-STRIPE-PLAID.md)
