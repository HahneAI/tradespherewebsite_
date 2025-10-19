/**
 * ==================================================================================
 * COMPREHENSIVE REGISTRATION FLOW TEST SUITE
 * ==================================================================================
 *
 * Tests the complete owner registration with payment flow including:
 * - Frontend form validation
 * - API integration (Netlify function)
 * - Database record creation (Supabase)
 * - Dwolla payment integration (sandbox)
 *
 * SETUP INSTRUCTIONS:
 * -------------------
 * 1. Ensure local Netlify dev server is running:
 *    npm install -g netlify-cli
 *    netlify dev
 *
 * 2. Ensure .env file has required credentials:
 *    - DWOLLA_APP_KEY
 *    - DWOLLA_APP_SECRET
 *    - DWOLLA_ENVIRONMENT=sandbox
 *    - VITE_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 *
 * 3. Install required dependencies:
 *    npm install @supabase/supabase-js dotenv
 *
 * USAGE:
 * ------
 * Run all tests:
 *   node test-registration-flow.js
 *
 * Run with cleanup:
 *   node test-registration-flow.js --cleanup
 *
 * Run specific category:
 *   node test-registration-flow.js --category=validation
 *   node test-registration-flow.js --category=api
 *   node test-registration-flow.js --category=database
 *   node test-registration-flow.js --category=dwolla
 *
 * ==================================================================================
 */

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// ==================================================================================
// CONFIGURATION
// ==================================================================================

const CONFIG = {
  BASE_URL: 'http://localhost:8888',
  FUNCTION_PATH: '/.netlify/functions/signup-with-payment',
  DWOLLA_TEST_ROUTING: {
    VALID: '222222226',
    INVALID: '111111116'
  },
  PLAN_PRICING: {
    standard: 2000,  // $20.00
    pro: 3500,       // $35.00
    enterprise: 5000 // $50.00
  },
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// Color codes for terminal output
const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m'
};

// Test results tracking
const RESULTS = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Track created resources for cleanup
const CREATED_RESOURCES = {
  authUserIds: [],
  companyIds: [],
  emails: []
};

// ==================================================================================
// UTILITY FUNCTIONS
// ==================================================================================

/**
 * Generate unique test email
 */
function generateTestEmail(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}@tradesphere-test.com`;
}

/**
 * Print colored message
 */
function print(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

/**
 * Print test header
 */
function printTestHeader(category, description) {
  print('\n' + '='.repeat(80), COLORS.CYAN);
  print(`  ${category.toUpperCase()}: ${description}`, COLORS.CYAN);
  print('='.repeat(80), COLORS.CYAN);
}

/**
 * Print test result
 */
function printTestResult(testName, passed, message = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? COLORS.GREEN : COLORS.RED;
  const status = passed ? 'PASS' : 'FAIL';

  print(`  ${symbol} ${testName}`, color);

  if (message) {
    print(`    ${message}`, COLORS.GRAY);
  }

  RESULTS.tests.push({ name: testName, passed, message });

  if (passed) {
    RESULTS.passed++;
  } else {
    RESULTS.failed++;
  }
}

/**
 * Skip test
 */
function skipTest(testName, reason) {
  print(`  ⊘ ${testName}`, COLORS.YELLOW);
  print(`    SKIPPED: ${reason}`, COLORS.GRAY);
  RESULTS.skipped++;
}

/**
 * Make request to signup function
 */
async function makeSignupRequest(data) {
  const url = `${CONFIG.BASE_URL}${CONFIG.FUNCTION_PATH}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();

    return {
      status: response.status,
      data: responseData,
      ok: response.ok
    };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

/**
 * Get valid test data
 */
function getValidTestData(overrides = {}) {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: generateTestEmail('valid'),
    password: 'SecurePass123!',
    companyName: 'Test Company LLC',
    industry: 'Landscaping',
    businessType: 'llc',
    routingNumber: CONFIG.DWOLLA_TEST_ROUTING.VALID,
    accountNumber: '1234567890',
    bankAccountType: 'checking',
    bankAccountName: 'Test Company Checking',
    selectedPlan: 'standard',
    agreeToTerms: true,
    authorizePayments: true,
    ...overrides
  };
}

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Cleanup test resources
 */
async function cleanupResources() {
  if (CREATED_RESOURCES.authUserIds.length === 0 && CREATED_RESOURCES.companyIds.length === 0) {
    return;
  }

  print('\n' + '='.repeat(80), COLORS.YELLOW);
  print('  CLEANUP: Removing test data', COLORS.YELLOW);
  print('='.repeat(80), COLORS.YELLOW);

  try {
    const supabase = getSupabaseClient();

    // Delete auth users
    for (const userId of CREATED_RESOURCES.authUserIds) {
      try {
        await supabase.auth.admin.deleteUser(userId);
        print(`  ✓ Deleted auth user: ${userId}`, COLORS.GREEN);
      } catch (error) {
        print(`  ✗ Failed to delete auth user ${userId}: ${error.message}`, COLORS.RED);
      }
    }

    // Delete companies (cascades to users table via FK)
    for (const companyId of CREATED_RESOURCES.companyIds) {
      try {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', companyId);

        if (error) throw error;
        print(`  ✓ Deleted company: ${companyId}`, COLORS.GREEN);
      } catch (error) {
        print(`  ✗ Failed to delete company ${companyId}: ${error.message}`, COLORS.RED);
      }
    }

    print(`\n  Total cleaned: ${CREATED_RESOURCES.authUserIds.length} users, ${CREATED_RESOURCES.companyIds.length} companies`, COLORS.GRAY);

  } catch (error) {
    print(`  Cleanup error: ${error.message}`, COLORS.RED);
  }
}

// ==================================================================================
// TEST CATEGORY A: FRONTEND FORM VALIDATION TESTS
// ==================================================================================

async function testFrontendValidation() {
  printTestHeader('CATEGORY A', 'Frontend Form Validation Tests');

  // Test A1: Empty form submission
  try {
    const response = await makeSignupRequest({});
    const passed = response.status === 400 &&
                   response.data.error === 'Validation failed';
    printTestResult(
      'A1: Empty form submission',
      passed,
      passed ? 'Correctly rejected empty form' : `Expected 400 validation error, got ${response.status}`
    );
  } catch (error) {
    printTestResult('A1: Empty form submission', false, error.message);
  }

  // Test A2: Invalid email format
  try {
    const data = getValidTestData({ email: 'invalid-email' });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('Invalid email format');
    printTestResult(
      'A2: Invalid email format',
      passed,
      passed ? 'Correctly rejected invalid email' : `Expected email validation error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A2: Invalid email format', false, error.message);
  }

  // Test A3: Password too short (< 8 chars)
  try {
    const data = getValidTestData({ password: 'Short1!' });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('at least 8 characters');
    printTestResult(
      'A3: Password too short',
      passed,
      passed ? 'Correctly rejected short password' : `Expected password length error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A3: Password too short', false, error.message);
  }

  // Test A4: Invalid routing number (not 9 digits)
  try {
    const data = getValidTestData({ routingNumber: '12345' });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('exactly 9 digits');
    printTestResult(
      'A4: Invalid routing number (not 9 digits)',
      passed,
      passed ? 'Correctly rejected invalid routing number' : `Expected routing validation error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A4: Invalid routing number (not 9 digits)', false, error.message);
  }

  // Test A5: Routing number with letters
  try {
    const data = getValidTestData({ routingNumber: '12345678A' });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('exactly 9 digits');
    printTestResult(
      'A5: Routing number with letters',
      passed,
      passed ? 'Correctly rejected non-numeric routing number' : `Expected routing validation error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A5: Routing number with letters', false, error.message);
  }

  // Test A6: Unchecked legal agreements (terms)
  try {
    const data = getValidTestData({ agreeToTerms: false });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('terms and conditions');
    printTestResult(
      'A6: Unchecked terms agreement',
      passed,
      passed ? 'Correctly rejected unchecked terms' : `Expected terms validation error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A6: Unchecked terms agreement', false, error.message);
  }

  // Test A7: Unchecked legal agreements (authorize payments)
  try {
    const data = getValidTestData({ authorizePayments: false });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('authorize payment');
    printTestResult(
      'A7: Unchecked payment authorization',
      passed,
      passed ? 'Correctly rejected unchecked authorization' : `Expected authorization validation error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A7: Unchecked payment authorization', false, error.message);
  }

  // Test A8: Invalid plan selection
  try {
    const data = getValidTestData({ selectedPlan: 'invalid-plan' });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('Invalid plan');
    printTestResult(
      'A8: Invalid plan selection',
      passed,
      passed ? 'Correctly rejected invalid plan' : `Expected plan validation error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A8: Invalid plan selection', false, error.message);
  }

  // Test A9: Missing required fields
  try {
    const data = getValidTestData({ firstName: '', companyName: '' });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('required');
    printTestResult(
      'A9: Missing required fields',
      passed,
      passed ? 'Correctly rejected missing required fields' : `Expected required field error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A9: Missing required fields', false, error.message);
  }

  // Test A10: Invalid bank account type
  try {
    const data = getValidTestData({ bankAccountType: 'invalid' });
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 &&
                   response.data.details?.includes('checking or savings');
    printTestResult(
      'A10: Invalid bank account type',
      passed,
      passed ? 'Correctly rejected invalid account type' : `Expected account type validation error, got: ${response.data.details}`
    );
  } catch (error) {
    printTestResult('A10: Invalid bank account type', false, error.message);
  }
}

// ==================================================================================
// TEST CATEGORY B: API INTEGRATION TESTS
// ==================================================================================

async function testAPIIntegration() {
  printTestHeader('CATEGORY B', 'API Integration Tests');

  // Check if credentials are available
  const hasCredentials = CONFIG.SUPABASE_URL &&
                        CONFIG.SUPABASE_KEY &&
                        process.env.DWOLLA_APP_KEY &&
                        process.env.DWOLLA_APP_SECRET;

  if (!hasCredentials) {
    skipTest('B1-B7', 'Missing required credentials (Supabase or Dwolla)');
    return;
  }

  // Test B1: Invalid HTTP method (GET should return 405)
  try {
    const url = `${CONFIG.BASE_URL}${CONFIG.FUNCTION_PATH}`;
    const response = await fetch(url, { method: 'GET' });
    const passed = response.status === 405;
    printTestResult(
      'B1: Invalid HTTP method (GET)',
      passed,
      passed ? 'Correctly returned 405 Method Not Allowed' : `Expected 405, got ${response.status}`
    );
  } catch (error) {
    printTestResult('B1: Invalid HTTP method (GET)', false, error.message);
  }

  // Test B2: Missing required fields
  try {
    const data = { email: generateTestEmail('missing-fields') };
    const response = await makeSignupRequest(data);
    const passed = response.status === 400 && response.data.error === 'Validation failed';
    printTestResult(
      'B2: Missing required fields',
      passed,
      passed ? 'Correctly rejected incomplete data' : `Expected 400 validation error, got ${response.status}`
    );
  } catch (error) {
    printTestResult('B2: Missing required fields', false, error.message);
  }

  // Test B3: Duplicate email registration
  try {
    const duplicateEmail = generateTestEmail('duplicate');
    const data = getValidTestData({ email: duplicateEmail });

    // First registration
    const firstResponse = await makeSignupRequest(data);

    if (firstResponse.ok && firstResponse.data.data?.userId) {
      CREATED_RESOURCES.authUserIds.push(firstResponse.data.data.userId);
      CREATED_RESOURCES.companyIds.push(firstResponse.data.data.companyId);

      // Wait a moment for DB to commit
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second registration with same email
      const secondResponse = await makeSignupRequest(data);
      const passed = secondResponse.status === 400 &&
                     secondResponse.data.details?.includes('already registered');
      printTestResult(
        'B3: Duplicate email registration',
        passed,
        passed ? 'Correctly rejected duplicate email' : `Expected duplicate email error, got: ${secondResponse.data.details}`
      );
    } else {
      printTestResult('B3: Duplicate email registration', false, 'First registration failed');
    }
  } catch (error) {
    printTestResult('B3: Duplicate email registration', false, error.message);
  }

  // Test B4: Successful complete signup flow (end-to-end)
  try {
    const data = getValidTestData({ email: generateTestEmail('success-e2e') });
    const response = await makeSignupRequest(data);

    const passed = response.status === 200 &&
                   response.data.success === true &&
                   response.data.data?.userId &&
                   response.data.data?.companyId;

    if (response.data.data?.userId) {
      CREATED_RESOURCES.authUserIds.push(response.data.data.userId);
      CREATED_RESOURCES.companyIds.push(response.data.data.companyId);
    }

    printTestResult(
      'B4: Successful complete signup flow (E2E)',
      passed,
      passed ? `User: ${response.data.data.userId}, Company: ${response.data.data.companyId}` : `Expected success response, got ${response.status}`
    );
  } catch (error) {
    printTestResult('B4: Successful complete signup flow (E2E)', false, error.message);
  }

  // Test B5: Invalid Dwolla routing number handling
  try {
    const data = getValidTestData({
      email: generateTestEmail('invalid-routing'),
      routingNumber: CONFIG.DWOLLA_TEST_ROUTING.INVALID
    });
    const response = await makeSignupRequest(data);

    // Dwolla will reject invalid routing number during bank account setup
    const passed = response.status === 500 &&
                   (response.data.error === 'Bank account setup failed' ||
                    response.data.details?.includes('bank account'));

    printTestResult(
      'B5: Invalid Dwolla routing number handling',
      passed,
      passed ? 'Correctly handled invalid Dwolla routing number' : `Expected bank account error, got: ${response.data.error}`
    );
  } catch (error) {
    printTestResult('B5: Invalid Dwolla routing number handling', false, error.message);
  }

  // Test B6: Test all 3 plan tiers
  try {
    const plans = ['standard', 'pro', 'enterprise'];
    let allPassed = true;
    const planResults = [];

    for (const plan of plans) {
      const data = getValidTestData({
        email: generateTestEmail(`plan-${plan}`),
        selectedPlan: plan
      });
      const response = await makeSignupRequest(data);

      if (response.ok && response.data.data?.userId) {
        CREATED_RESOURCES.authUserIds.push(response.data.data.userId);
        CREATED_RESOURCES.companyIds.push(response.data.data.companyId);
        planResults.push(`${plan}:✓`);
      } else {
        allPassed = false;
        planResults.push(`${plan}:✗`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    printTestResult(
      'B6: Test all 3 plan tiers',
      allPassed,
      planResults.join(', ')
    );
  } catch (error) {
    printTestResult('B6: Test all 3 plan tiers', false, error.message);
  }

  // Test B7: Different business types
  try {
    const businessTypes = ['llc', 'corporation', 'partnership', 'soleProprietorship'];
    let allPassed = true;
    const typeResults = [];

    for (const bizType of businessTypes) {
      const data = getValidTestData({
        email: generateTestEmail(`biz-${bizType}`),
        businessType: bizType
      });
      const response = await makeSignupRequest(data);

      if (response.ok && response.data.data?.userId) {
        CREATED_RESOURCES.authUserIds.push(response.data.data.userId);
        CREATED_RESOURCES.companyIds.push(response.data.data.companyId);
        typeResults.push(`${bizType}:✓`);
      } else {
        allPassed = false;
        typeResults.push(`${bizType}:✗`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    printTestResult(
      'B7: Different business types',
      allPassed,
      typeResults.join(', ')
    );
  } catch (error) {
    printTestResult('B7: Different business types', false, error.message);
  }
}

// ==================================================================================
// TEST CATEGORY C: DATABASE TESTS
// ==================================================================================

async function testDatabase() {
  printTestHeader('CATEGORY C', 'Database Record Creation Tests');

  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
    skipTest('C1-C5', 'Supabase credentials not configured');
    return;
  }

  const supabase = getSupabaseClient();

  // Create a test user first
  const testData = getValidTestData({ email: generateTestEmail('db-test') });
  let response;

  try {
    response = await makeSignupRequest(testData);

    if (!response.ok || !response.data.data?.userId) {
      print('  ⚠ Failed to create test user for database tests', COLORS.YELLOW);
      skipTest('C1-C5', 'Could not create test user');
      return;
    }

    const userId = response.data.data.userId;
    const companyId = response.data.data.companyId;

    CREATED_RESOURCES.authUserIds.push(userId);
    CREATED_RESOURCES.companyIds.push(companyId);

    // Small delay for DB commit
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test C1: Company record created with correct fields
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      const passed = company &&
                     company.name === testData.companyName &&
                     company.email === testData.email &&
                     company.subscription_tier === testData.selectedPlan &&
                     company.dwolla_customer_url &&
                     company.dwolla_funding_source_id;

      printTestResult(
        'C1: Company record created with correct fields',
        passed,
        passed ? `Company: ${company.name}, Tier: ${company.subscription_tier}` : 'Company record missing or incomplete'
      );
    } catch (error) {
      printTestResult('C1: Company record created with correct fields', false, error.message);
    }

    // Test C2: User record created with role='owner' and is_owner=true
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const passed = user &&
                     user.role === 'owner' &&
                     user.is_owner === true &&
                     user.company_id === companyId &&
                     user.email === testData.email;

      printTestResult(
        'C2: User record created with role=owner and is_owner=true',
        passed,
        passed ? `User: ${user.name}, Role: ${user.role}, is_owner: ${user.is_owner}` : 'User record missing or incorrect'
      );
    } catch (error) {
      printTestResult('C2: User record created with role=owner and is_owner=true', false, error.message);
    }

    // Test C3: Trial period set to 30 days
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('trial_end_date, subscription_status')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      const trialEndDate = new Date(company.trial_end_date);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);

      // Allow 1 day variance for test execution time
      const daysDiff = Math.abs((trialEndDate - expectedDate) / (1000 * 60 * 60 * 24));
      const passed = daysDiff <= 1 && company.subscription_status === 'trial';

      printTestResult(
        'C3: Trial period set to 30 days',
        passed,
        passed ? `Trial ends: ${company.trial_end_date}, Status: ${company.subscription_status}` : `Trial date mismatch: ${daysDiff} days off`
      );
    } catch (error) {
      printTestResult('C3: Trial period set to 30 days', false, error.message);
    }

    // Test C4: Payment method status set to 'pending'
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('payment_method_status')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      const passed = company.payment_method_status === 'pending';

      printTestResult(
        'C4: Payment method status set to pending',
        passed,
        passed ? `Status: ${company.payment_method_status}` : `Expected 'pending', got '${company.payment_method_status}'`
      );
    } catch (error) {
      printTestResult('C4: Payment method status set to pending', false, error.message);
    }

    // Test C5: Monthly amount matches selected plan
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('monthly_amount, subscription_tier')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      const expectedAmount = CONFIG.PLAN_PRICING[testData.selectedPlan];
      const passed = company.monthly_amount === expectedAmount;

      printTestResult(
        'C5: Monthly amount matches selected plan',
        passed,
        passed ? `Plan: ${company.subscription_tier}, Amount: $${company.monthly_amount / 100}` : `Expected ${expectedAmount}, got ${company.monthly_amount}`
      );
    } catch (error) {
      printTestResult('C5: Monthly amount matches selected plan', false, error.message);
    }

  } catch (error) {
    print(`  Database test setup failed: ${error.message}`, COLORS.RED);
    skipTest('C1-C5', 'Test setup failed');
  }
}

// ==================================================================================
// TEST CATEGORY D: DWOLLA INTEGRATION TESTS
// ==================================================================================

async function testDwollaIntegration() {
  printTestHeader('CATEGORY D', 'Dwolla Integration Tests (Sandbox)');

  if (!process.env.DWOLLA_APP_KEY || !process.env.DWOLLA_APP_SECRET) {
    skipTest('D1-D5', 'Dwolla credentials not configured');
    return;
  }

  // Test D1: Valid routing number accepted
  try {
    const data = getValidTestData({
      email: generateTestEmail('dwolla-valid-routing'),
      routingNumber: CONFIG.DWOLLA_TEST_ROUTING.VALID
    });
    const response = await makeSignupRequest(data);

    const passed = response.ok && response.data.success === true;

    if (response.data.data?.userId) {
      CREATED_RESOURCES.authUserIds.push(response.data.data.userId);
      CREATED_RESOURCES.companyIds.push(response.data.data.companyId);
    }

    printTestResult(
      'D1: Valid routing number accepted (222222226)',
      passed,
      passed ? 'Dwolla accepted valid routing number' : `Expected success, got: ${response.data.error}`
    );
  } catch (error) {
    printTestResult('D1: Valid routing number accepted (222222226)', false, error.message);
  }

  // Test D2: Invalid routing number handled
  try {
    const data = getValidTestData({
      email: generateTestEmail('dwolla-invalid-routing'),
      routingNumber: CONFIG.DWOLLA_TEST_ROUTING.INVALID
    });
    const response = await makeSignupRequest(data);

    const passed = !response.ok &&
                   (response.data.error === 'Bank account setup failed' ||
                    response.data.details?.includes('bank account'));

    printTestResult(
      'D2: Invalid routing number handled (111111116)',
      passed,
      passed ? 'Dwolla correctly rejected invalid routing number' : `Expected rejection, got: ${response.data.error}`
    );
  } catch (error) {
    printTestResult('D2: Invalid routing number handled (111111116)', false, error.message);
  }

  // Test D3: Customer creation successful
  try {
    const data = getValidTestData({ email: generateTestEmail('dwolla-customer') });
    const response = await makeSignupRequest(data);

    const passed = response.ok && response.data.success === true;

    if (response.data.data?.userId) {
      CREATED_RESOURCES.authUserIds.push(response.data.data.userId);
      CREATED_RESOURCES.companyIds.push(response.data.data.companyId);

      // Verify Dwolla customer URL in database
      const supabase = getSupabaseClient();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: company } = await supabase
        .from('companies')
        .select('dwolla_customer_url')
        .eq('id', response.data.data.companyId)
        .single();

      const hasCustomerUrl = company?.dwolla_customer_url?.includes('customers/');

      printTestResult(
        'D3: Customer creation successful',
        passed && hasCustomerUrl,
        hasCustomerUrl ? `Customer URL: ${company.dwolla_customer_url.substring(0, 60)}...` : 'Customer URL not found'
      );
    } else {
      printTestResult('D3: Customer creation successful', false, 'Signup failed');
    }
  } catch (error) {
    printTestResult('D3: Customer creation successful', false, error.message);
  }

  // Test D4: Funding source creation successful
  try {
    const data = getValidTestData({ email: generateTestEmail('dwolla-funding') });
    const response = await makeSignupRequest(data);

    const passed = response.ok && response.data.success === true;

    if (response.data.data?.userId) {
      CREATED_RESOURCES.authUserIds.push(response.data.data.userId);
      CREATED_RESOURCES.companyIds.push(response.data.data.companyId);

      // Verify funding source ID in database
      const supabase = getSupabaseClient();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: company } = await supabase
        .from('companies')
        .select('dwolla_funding_source_id')
        .eq('id', response.data.data.companyId)
        .single();

      const hasFundingSourceId = company?.dwolla_funding_source_id?.length > 0;

      printTestResult(
        'D4: Funding source creation successful',
        passed && hasFundingSourceId,
        hasFundingSourceId ? `Funding source ID: ${company.dwolla_funding_source_id}` : 'Funding source ID not found'
      );
    } else {
      printTestResult('D4: Funding source creation successful', false, 'Signup failed');
    }
  } catch (error) {
    printTestResult('D4: Funding source creation successful', false, error.message);
  }

  // Test D5: Micro-deposit initiation (non-fatal check)
  try {
    const data = getValidTestData({ email: generateTestEmail('dwolla-microdeposit') });
    const response = await makeSignupRequest(data);

    // Micro-deposit failure is non-fatal, so signup should still succeed
    const passed = response.ok && response.data.success === true;

    if (response.data.data?.userId) {
      CREATED_RESOURCES.authUserIds.push(response.data.data.userId);
      CREATED_RESOURCES.companyIds.push(response.data.data.companyId);
    }

    printTestResult(
      'D5: Micro-deposit initiation (non-fatal)',
      passed,
      passed ? 'Signup succeeded even if micro-deposits fail' : 'Signup should succeed even with micro-deposit failure'
    );
  } catch (error) {
    printTestResult('D5: Micro-deposit initiation (non-fatal)', false, error.message);
  }
}

// ==================================================================================
// MAIN TEST RUNNER
// ==================================================================================

async function runTests() {
  print('\n');
  print('='.repeat(80), COLORS.BLUE);
  print('  OWNER REGISTRATION WITH PAYMENT FLOW - COMPREHENSIVE TEST SUITE', COLORS.BLUE);
  print('='.repeat(80), COLORS.BLUE);
  print(`  Base URL: ${CONFIG.BASE_URL}`, COLORS.GRAY);
  print(`  Function: ${CONFIG.FUNCTION_PATH}`, COLORS.GRAY);
  print(`  Supabase: ${CONFIG.SUPABASE_URL ? 'Configured' : 'NOT CONFIGURED'}`, COLORS.GRAY);
  print(`  Dwolla: ${process.env.DWOLLA_APP_KEY ? 'Configured (Sandbox)' : 'NOT CONFIGURED'}`, COLORS.GRAY);
  print('='.repeat(80), COLORS.BLUE);

  const args = process.argv.slice(2);
  const category = args.find(arg => arg.startsWith('--category='))?.split('=')[1];
  const cleanup = args.includes('--cleanup');

  try {
    if (!category || category === 'validation') {
      await testFrontendValidation();
    }

    if (!category || category === 'api') {
      await testAPIIntegration();
    }

    if (!category || category === 'database') {
      await testDatabase();
    }

    if (!category || category === 'dwolla') {
      await testDwollaIntegration();
    }

    // Cleanup if requested
    if (cleanup) {
      await cleanupResources();
    }

    // Print summary
    print('\n' + '='.repeat(80), COLORS.BLUE);
    print('  TEST SUMMARY', COLORS.BLUE);
    print('='.repeat(80), COLORS.BLUE);
    print(`  Total Tests: ${RESULTS.passed + RESULTS.failed + RESULTS.skipped}`, COLORS.CYAN);
    print(`  Passed: ${RESULTS.passed}`, COLORS.GREEN);
    print(`  Failed: ${RESULTS.failed}`, RESULTS.failed > 0 ? COLORS.RED : COLORS.GREEN);
    print(`  Skipped: ${RESULTS.skipped}`, COLORS.YELLOW);
    print('='.repeat(80), COLORS.BLUE);

    if (RESULTS.failed > 0) {
      print('\n  FAILED TESTS:', COLORS.RED);
      RESULTS.tests
        .filter(t => !t.passed)
        .forEach(t => {
          print(`    ✗ ${t.name}`, COLORS.RED);
          if (t.message) print(`      ${t.message}`, COLORS.GRAY);
        });
    }

    if (!cleanup && CREATED_RESOURCES.authUserIds.length > 0) {
      print('\n  ⚠ Test data created but not cleaned up', COLORS.YELLOW);
      print(`    Run with --cleanup flag to remove test data`, COLORS.GRAY);
      print(`    ${CREATED_RESOURCES.authUserIds.length} users, ${CREATED_RESOURCES.companyIds.length} companies`, COLORS.GRAY);
    }

    print('');

    // Exit with appropriate code
    process.exit(RESULTS.failed > 0 ? 1 : 0);

  } catch (error) {
    print(`\n  FATAL ERROR: ${error.message}`, COLORS.RED);
    console.error(error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(CONFIG.BASE_URL, { method: 'HEAD' });
    return true;
  } catch (error) {
    print('\n  ✗ ERROR: Netlify dev server is not running', COLORS.RED);
    print('    Please start the server first:', COLORS.YELLOW);
    print('    1. Open a terminal', COLORS.GRAY);
    print('    2. Run: netlify dev', COLORS.GRAY);
    print('    3. Wait for server to start on http://localhost:8888', COLORS.GRAY);
    print('    4. Run this test again\n', COLORS.GRAY);
    return false;
  }
}

// Run tests if server is available
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  } else {
    process.exit(1);
  }
})();
