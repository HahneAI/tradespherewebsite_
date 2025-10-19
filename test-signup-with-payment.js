/**
 * TEST SCRIPT: Signup with Payment Function
 *
 * This script tests the complete owner registration flow with payment setup.
 *
 * Prerequisites:
 * 1. Set up your .env file with required variables
 * 2. Run: netlify dev (to start local functions server)
 * 3. In another terminal, run: node test-signup-with-payment.js
 */

const fetch = require('node-fetch');

// Configuration
const FUNCTION_URL = process.env.FUNCTION_URL || 'http://localhost:8888/.netlify/functions/signup-with-payment';

// Test data - using Dwolla sandbox test credentials
const TEST_DATA = {
  // Valid test case
  valid: {
    firstName: 'John',
    lastName: 'Doe',
    email: `test-${Date.now()}@example.com`, // Unique email each time
    password: 'TestPassword123!',
    companyName: `Test Landscaping ${Date.now()}`,
    industry: 'landscaping',
    businessType: 'llc',
    routingNumber: '222222226', // Dwolla sandbox routing number
    accountNumber: '123456789',
    bankAccountType: 'checking',
    bankAccountName: 'Company Checking',
    selectedPlan: 'standard',
    agreeToTerms: true,
    authorizePayments: true
  },

  // Invalid cases for testing validation
  missingEmail: {
    firstName: 'John',
    lastName: 'Doe',
    // email missing
    password: 'TestPassword123!',
    companyName: 'Test Company',
    routingNumber: '222222226',
    accountNumber: '123456789',
    bankAccountType: 'checking',
    selectedPlan: 'standard',
    agreeToTerms: true,
    authorizePayments: true
  },

  invalidEmail: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'not-an-email',
    password: 'TestPassword123!',
    companyName: 'Test Company',
    routingNumber: '222222226',
    accountNumber: '123456789',
    bankAccountType: 'checking',
    selectedPlan: 'standard',
    agreeToTerms: true,
    authorizePayments: true
  },

  shortPassword: {
    firstName: 'John',
    lastName: 'Doe',
    email: `test-${Date.now()}@example.com`,
    password: 'short',
    companyName: 'Test Company',
    routingNumber: '222222226',
    accountNumber: '123456789',
    bankAccountType: 'checking',
    selectedPlan: 'standard',
    agreeToTerms: true,
    authorizePayments: true
  },

  invalidRoutingNumber: {
    firstName: 'John',
    lastName: 'Doe',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    companyName: 'Test Company',
    routingNumber: '12345', // Too short
    accountNumber: '123456789',
    bankAccountType: 'checking',
    selectedPlan: 'standard',
    agreeToTerms: true,
    authorizePayments: true
  },

  missingLegalAgreement: {
    firstName: 'John',
    lastName: 'Doe',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    companyName: 'Test Company',
    routingNumber: '222222226',
    accountNumber: '123456789',
    bankAccountType: 'checking',
    selectedPlan: 'standard',
    agreeToTerms: false, // Not agreed
    authorizePayments: true
  }
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to make request
async function testSignup(testName, data, expectedStatus = 200) {
  console.log(`\n${colors.cyan}Testing: ${testName}${colors.reset}`);
  console.log(`Expected Status: ${expectedStatus}`);

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.status === expectedStatus) {
      console.log(`${colors.green}✓ Status: ${response.status} (Expected)${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Status: ${response.status} (Expected: ${expectedStatus})${colors.reset}`);
    }

    console.log('Response:', JSON.stringify(result, null, 2));

    return { success: response.status === expectedStatus, status: response.status, result };
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.bright}${colors.blue}======================================`);
  console.log('SIGNUP WITH PAYMENT - TEST SUITE');
  console.log(`======================================${colors.reset}\n`);

  console.log(`Function URL: ${FUNCTION_URL}\n`);

  const results = [];

  // Test 1: Valid signup
  console.log(`${colors.bright}Test 1: Valid Signup${colors.reset}`);
  const validResult = await testSignup('Valid signup with all fields', TEST_DATA.valid, 200);
  results.push({ name: 'Valid signup', ...validResult });

  // Store successful data for duplicate test
  const duplicateEmail = TEST_DATA.valid.email;

  // Test 2: Missing email
  console.log(`\n${colors.bright}Test 2: Missing Email${colors.reset}`);
  const missingEmailResult = await testSignup('Missing email field', TEST_DATA.missingEmail, 400);
  results.push({ name: 'Missing email', ...missingEmailResult });

  // Test 3: Invalid email format
  console.log(`\n${colors.bright}Test 3: Invalid Email Format${colors.reset}`);
  const invalidEmailResult = await testSignup('Invalid email format', TEST_DATA.invalidEmail, 400);
  results.push({ name: 'Invalid email', ...invalidEmailResult });

  // Test 4: Short password
  console.log(`\n${colors.bright}Test 4: Short Password${colors.reset}`);
  const shortPasswordResult = await testSignup('Password too short', TEST_DATA.shortPassword, 400);
  results.push({ name: 'Short password', ...shortPasswordResult });

  // Test 5: Invalid routing number
  console.log(`\n${colors.bright}Test 5: Invalid Routing Number${colors.reset}`);
  const invalidRoutingResult = await testSignup('Invalid routing number', TEST_DATA.invalidRoutingNumber, 400);
  results.push({ name: 'Invalid routing number', ...invalidRoutingResult });

  // Test 6: Missing legal agreement
  console.log(`\n${colors.bright}Test 6: Missing Legal Agreement${colors.reset}`);
  const missingLegalResult = await testSignup('Terms not agreed', TEST_DATA.missingLegalAgreement, 400);
  results.push({ name: 'Missing legal agreement', ...missingLegalResult });

  // Test 7: Duplicate email (if first test succeeded)
  if (validResult.success) {
    console.log(`\n${colors.bright}Test 7: Duplicate Email${colors.reset}`);
    const duplicateData = { ...TEST_DATA.valid, email: duplicateEmail };
    const duplicateResult = await testSignup('Duplicate email address', duplicateData, 400);
    results.push({ name: 'Duplicate email', ...duplicateResult });
  }

  // Test 8: GET request (should return 405)
  console.log(`\n${colors.bright}Test 8: Invalid HTTP Method${colors.reset}`);
  console.log(`${colors.cyan}Testing: GET request (should be rejected)${colors.reset}`);
  try {
    const response = await fetch(FUNCTION_URL, { method: 'GET' });
    const result = await response.json();
    const success = response.status === 405;
    console.log(success
      ? `${colors.green}✓ Status: ${response.status} (Method Not Allowed)${colors.reset}`
      : `${colors.red}✗ Status: ${response.status} (Expected: 405)${colors.reset}`
    );
    results.push({ name: 'Invalid HTTP method', success, status: response.status });
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    results.push({ name: 'Invalid HTTP method', success: false, error: error.message });
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}======================================`);
  console.log('TEST SUMMARY');
  console.log(`======================================${colors.reset}\n`);

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? `${colors.green}✓` : `${colors.red}✗`;
    const status = result.error ? `Error: ${result.error}` : `Status: ${result.status}`;
    console.log(`${icon} ${result.name}: ${status}${colors.reset}`);
  });

  console.log(`\n${colors.bright}Total: ${results.length} | ${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`);

  // If valid signup succeeded, show the created user info
  if (validResult.success && validResult.result?.data) {
    console.log(`\n${colors.bright}${colors.green}Successfully Created User:${colors.reset}`);
    console.log(`Email: ${TEST_DATA.valid.email}`);
    console.log(`Company: ${TEST_DATA.valid.companyName}`);
    console.log(`User ID: ${validResult.result.data.userId}`);
    console.log(`Company ID: ${validResult.result.data.companyId}`);
    console.log(`Trial End Date: ${validResult.result.data.trialEndDate}`);

    if (validResult.result.data.sessionToken) {
      console.log(`\n${colors.yellow}Session token generated - user can auto-login${colors.reset}`);
    }
  }

  console.log(`\n${colors.cyan}Test suite completed!${colors.reset}\n`);
}

// Check if function is running
async function checkFunctionAvailability() {
  try {
    console.log(`${colors.yellow}Checking if Netlify functions are running...${colors.reset}`);
    const response = await fetch(FUNCTION_URL, { method: 'OPTIONS' });
    // We expect 405 for OPTIONS, but any response means server is up
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`${colors.red}Error: Netlify functions are not running!${colors.reset}`);
      console.log(`\nPlease start the development server first:`);
      console.log(`${colors.cyan}npm run dev${colors.reset} or ${colors.cyan}netlify dev${colors.reset}\n`);
      return false;
    }
    // Other errors might be OK (like 405 Method Not Allowed)
    return true;
  }
}

// Run tests
(async () => {
  const isAvailable = await checkFunctionAvailability();
  if (isAvailable) {
    await runTests();
  } else {
    process.exit(1);
  }
})();