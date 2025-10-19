# Registration Flow Test Suite Documentation

## Overview

This comprehensive test suite validates the complete owner registration with payment flow for TradeSphere. It covers frontend validation, API integration, database operations, and Dwolla payment processing.

## Test Categories

### Category A: Frontend Form Validation Tests (10 tests)
Tests input validation and form requirements before submission:
- Empty form submission
- Invalid email format
- Password too short (< 8 characters)
- Invalid routing number (not 9 digits)
- Routing number with letters
- Unchecked terms agreement
- Unchecked payment authorization
- Invalid plan selection
- Missing required fields
- Invalid bank account type

### Category B: API Integration Tests (7 tests)
Tests Netlify function endpoints and API behavior:
- Invalid HTTP method (GET should return 405)
- Missing required fields
- Duplicate email registration
- Successful complete signup flow (end-to-end)
- Invalid Dwolla routing number handling
- All 3 plan tiers (standard, pro, enterprise)
- Different business types (LLC, corporation, partnership, sole proprietorship)

### Category C: Database Tests (5 tests)
Validates database record creation in Supabase:
- Company record created with correct fields
- User record created with role='owner' and is_owner=true
- Trial period set to 30 days
- Payment method status set to 'pending'
- Monthly amount matches selected plan

### Category D: Dwolla Integration Tests (5 tests)
Tests Dwolla sandbox payment integration:
- Valid routing number accepted (222222226)
- Invalid routing number handled (111111116)
- Customer creation successful
- Funding source creation successful
- Micro-deposit initiation (non-fatal check)

## Prerequisites

### 1. Environment Setup

Ensure your `.env` file contains:

```bash
# Dwolla Configuration
DWOLLA_APP_KEY=your_dwolla_app_key
DWOLLA_APP_SECRET=your_dwolla_app_secret
DWOLLA_ENVIRONMENT=sandbox

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration (optional)
FRONTEND_URL=your_frontend_url
COMPANY_FUNDING_SOURCE_URL=your_company_funding_source_url
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase client for database testing
- `dotenv` - Environment variable loader
- All other existing project dependencies

### 3. Start Netlify Dev Server

The test suite requires the local Netlify development server to be running:

```bash
netlify dev
```

Wait for the server to start on `http://localhost:8888` before running tests.

## Running Tests

### Run All Tests

```bash
npm run test:registration
```

or

```bash
node test-registration-flow.js
```

### Run All Tests with Cleanup

Automatically delete test data after running:

```bash
npm run test:registration:cleanup
```

or

```bash
node test-registration-flow.js --cleanup
```

### Run Specific Test Categories

**Frontend Validation Only:**
```bash
npm run test:registration:validation
```

**API Integration Only:**
```bash
npm run test:registration:api
```

**Database Tests Only:**
```bash
npm run test:registration:database
```

**Dwolla Integration Only:**
```bash
npm run test:registration:dwolla
```

## Test Output

### Color-Coded Results

- **Green (✓)**: Test passed
- **Red (✗)**: Test failed
- **Yellow (⊘)**: Test skipped (missing credentials or prerequisites)

### Example Output

```
================================================================================
  OWNER REGISTRATION WITH PAYMENT FLOW - COMPREHENSIVE TEST SUITE
================================================================================
  Base URL: http://localhost:8888
  Function: /.netlify/functions/signup-with-payment
  Supabase: Configured
  Dwolla: Configured (Sandbox)
================================================================================

================================================================================
  CATEGORY A: Frontend Form Validation Tests
================================================================================
  ✓ A1: Empty form submission
    Correctly rejected empty form
  ✓ A2: Invalid email format
    Correctly rejected invalid email
  ✓ A3: Password too short
    Correctly rejected short password
  ...

================================================================================
  TEST SUMMARY
================================================================================
  Total Tests: 27
  Passed: 25
  Failed: 0
  Skipped: 2
================================================================================
```

## Test Data Management

### Automatic Email Generation

The test suite generates unique test emails using timestamps:
```javascript
test-1634567890123-456@tradesphere-test.com
```

### Resource Tracking

All created resources are tracked for potential cleanup:
- Auth users (Supabase Auth)
- Company records (companies table)
- User records (users table, cascade deleted with company)

### Cleanup Strategy

**Manual Cleanup:**
```bash
npm run test:registration:cleanup
```

**Automatic Cleanup:**
The `--cleanup` flag removes all test data after test execution.

**What Gets Cleaned:**
- Supabase Auth users
- Company database records
- User database records (automatically via foreign key cascade)

## Dwolla Sandbox Test Data

### Test Routing Numbers

The suite uses Dwolla's sandbox test routing numbers:

- **Valid Routing Number:** `222222226` (accepted by Dwolla)
- **Invalid Routing Number:** `111111116` (rejected by Dwolla)

### Test Account Number

Any valid account number works in sandbox mode:
- Example: `1234567890`

### Micro-Deposits

In sandbox mode:
- Micro-deposits are initiated but may not complete
- Micro-deposit failures are non-fatal (signup still succeeds)
- Real amounts are not deposited in sandbox

## Troubleshooting

### Server Not Running

**Error:**
```
✗ ERROR: Netlify dev server is not running
```

**Solution:**
1. Open a terminal
2. Run `netlify dev`
3. Wait for server to start on http://localhost:8888
4. Run tests again

### Missing Credentials

**Error:**
```
⊘ B1-B7
  SKIPPED: Missing required credentials (Supabase or Dwolla)
```

**Solution:**
Check your `.env` file for:
- `DWOLLA_APP_KEY`
- `DWOLLA_APP_SECRET`
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database Connection Errors

**Symptoms:**
- Category C tests failing
- Database record verification failures

**Solutions:**
1. Verify Supabase credentials in `.env`
2. Check Supabase service role key has admin permissions
3. Ensure database schema matches expected structure
4. Check network connectivity to Supabase

### Dwolla API Errors

**Symptoms:**
- Category D tests failing
- Bank account setup failures

**Solutions:**
1. Verify Dwolla sandbox credentials
2. Check `DWOLLA_ENVIRONMENT=sandbox` in `.env`
3. Ensure Dwolla account is active
4. Verify routing number format (exactly 9 digits)

### Rate Limiting

If tests fail due to rate limiting:
1. Add delays between test categories
2. Run individual categories separately
3. Use `--cleanup` flag to reduce database load

## Test Coverage

### What's Tested

✅ Input validation (10 tests)
✅ API endpoints and HTTP methods (7 tests)
✅ Database record creation (5 tests)
✅ Dwolla payment integration (5 tests)
✅ Error handling and rollback
✅ All plan tiers (standard, pro, enterprise)
✅ All business types (LLC, corporation, etc.)
✅ Duplicate email prevention
✅ Legal agreement validation

### What's NOT Tested (Future Enhancements)

❌ Frontend React component rendering
❌ Email delivery (SendGrid integration)
❌ Session token authentication
❌ Micro-deposit verification flow
❌ Webhook handling
❌ Payment retry logic
❌ Trial expiration handling

## Best Practices

### 1. Run Tests Locally Before Deployment

Always run the full test suite before pushing to production:
```bash
npm run test:registration
```

### 2. Clean Up Test Data

Regularly clean up test data to avoid database bloat:
```bash
npm run test:registration:cleanup
```

### 3. Monitor Test Results

Check for:
- Increasing failure rates
- New error messages
- Performance degradation
- Skipped tests (missing credentials)

### 4. Update Tests with Code Changes

When modifying the registration flow:
1. Update affected test cases
2. Add new tests for new features
3. Remove obsolete tests
4. Verify all tests pass

### 5. Use Sandbox Mode Only

Never run tests against production:
- Verify `DWOLLA_ENVIRONMENT=sandbox`
- Use test Supabase project
- Use test email addresses

## Continuous Integration

### GitHub Actions Example

```yaml
name: Registration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: netlify dev & sleep 10
      - run: npm run test:registration:cleanup
        env:
          DWOLLA_APP_KEY: ${{ secrets.DWOLLA_APP_KEY }}
          DWOLLA_APP_SECRET: ${{ secrets.DWOLLA_APP_SECRET }}
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Contributing

### Adding New Tests

1. Determine appropriate category (A, B, C, or D)
2. Add test function to relevant section
3. Use existing helper functions (`getValidTestData`, `makeSignupRequest`)
4. Follow naming convention: `CategoryX: Test Description`
5. Update this README with new test details

### Test Structure

```javascript
try {
  const data = getValidTestData({ field: 'value' });
  const response = await makeSignupRequest(data);

  const passed = /* validation logic */;

  printTestResult(
    'Category: Test Name',
    passed,
    passed ? 'Success message' : 'Failure message'
  );
} catch (error) {
  printTestResult('Category: Test Name', false, error.message);
}
```

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review test output for specific error messages
3. Verify environment configuration
4. Contact development team

## Version History

- **v1.0.0** - Initial comprehensive test suite
  - 27 total tests across 4 categories
  - Automatic cleanup support
  - Category-specific test execution
  - Color-coded output
  - Resource tracking

---

**Last Updated:** 2025-10-18
**Maintained By:** TradeSphere Engineering Team
