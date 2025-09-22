#!/usr/bin/env node

/**
 * Trade-Sphere Dwolla Payment Flow End-to-End Test Script
 *
 * Tests the complete onboarding flow:
 * 1. Create Dwolla customer and funding source
 * 2. Process $2,000 ACH payment
 * 3. Simulate webhook events
 * 4. Verify company creation
 *
 * Usage: node test-dwolla-flow.js
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// Configuration
const BASE_URL = 'https://tscompanysite.netlify.app';
const TEST_COMPANY = {
  companyEmail: `test-${Date.now()}@tradetest.com`,
  companyName: `Test Company ${Date.now()}`,
  routingNumber: '222222226', // Valid test routing number for Dwolla sandbox
  accountNumber: '123456789',
  accountType: 'checking',
  accountHolderName: 'John Test Doe'
};

// Test results tracking
const testResults = {
  customerCreation: null,
  paymentProcessing: null,
  webhookHandling: null,
  companyCreation: null
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',  // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m'  // Yellow
  };
  const reset = '\x1b[0m';

  console.log(`${colors[type]}[${timestamp}] ${message}${reset}`);
}

function generateTestId() {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function makeRequest(endpoint, data, description) {
  log(`Testing: ${description}`);
  log(`POST ${BASE_URL}${endpoint}`);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Trade-Sphere-Test-Script/1.0'
      },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();

    if (response.ok) {
      log(`✅ ${description} - SUCCESS`, 'success');
      log(`Response: ${JSON.stringify(responseData, null, 2)}`, 'info');
      return { success: true, data: responseData };
    } else {
      log(`❌ ${description} - FAILED`, 'error');
      log(`Status: ${response.status}`, 'error');
      log(`Error: ${JSON.stringify(responseData, null, 2)}`, 'error');
      return { success: false, error: responseData };
    }
  } catch (error) {
    log(`❌ ${description} - NETWORK ERROR`, 'error');
    log(`Error: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

// Test 1: Create Dwolla Customer
async function testCreateDwollaCustomer() {
  log('🧪 TEST 1: Creating Dwolla Customer and Funding Source', 'info');

  const result = await makeRequest('/api/create-dwolla-customer', TEST_COMPANY, 'Customer Creation');

  testResults.customerCreation = result;

  if (result.success) {
    log(`Customer ID: ${result.data.customerId}`, 'success');
    log(`Funding Source URL: ${result.data.fundingSourceUrl}`, 'success');
    log(`Verification Status: ${result.data.verificationStatus}`, 'success');
  }

  return result;
}

// Test 2: Process Payment
async function testProcessPayment(customerData) {
  log('🧪 TEST 2: Processing $2,000 ACH Payment', 'info');

  if (!customerData.success) {
    log('⏭️  Skipping payment test - customer creation failed', 'warning');
    return { success: false, error: 'Customer creation prerequisite failed' };
  }

  const paymentData = {
    customerId: customerData.data.customerId,
    customerFundingSourceUrl: customerData.data.fundingSourceUrl,
    amount: 2000,
    companyEmail: TEST_COMPANY.companyEmail,
    companyName: TEST_COMPANY.companyName
  };

  const result = await makeRequest('/api/process-payment', paymentData, 'Payment Processing');

  testResults.paymentProcessing = result;

  if (result.success) {
    log(`Payment ID: ${result.data.paymentId}`, 'success');
    log(`Transfer ID: ${result.data.transferId}`, 'success');
    log(`Status: ${result.data.status}`, 'success');
  }

  return result;
}

// Test 3: Simulate Webhook Events
async function testWebhookHandling(paymentData) {
  log('🧪 TEST 3: Simulating Dwolla Webhook Events', 'info');

  if (!paymentData.success) {
    log('⏭️  Skipping webhook test - payment processing failed', 'warning');
    return { success: false, error: 'Payment processing prerequisite failed' };
  }

  // Simulate transfer_completed webhook
  const webhookPayload = {
    id: generateTestId(),
    topic: 'transfer_completed',
    accountId: 'sandbox-account-id',
    eventId: generateTestId(),
    subscriptionId: 'subscription-id',
    _links: {
      account: {
        href: 'https://api-sandbox.dwolla.com/accounts/sandbox-account'
      },
      resource: {
        href: 'https://api-sandbox.dwolla.com/transfers/' + (paymentData.data.transferId || 'test-transfer-id')
      },
      transfer: {
        href: 'https://api-sandbox.dwolla.com/transfers/' + (paymentData.data.transferId || 'test-transfer-id')
      }
    },
    created: new Date().toISOString()
  };

  // Generate webhook signature (this would normally be done by Dwolla)
  const webhookSecret = 'TradeSpherePro2024_SecretKey'; // From your .env
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(webhookPayload))
    .digest('hex');

  log('Simulating transfer_completed webhook...');

  try {
    const response = await fetch(`${BASE_URL}/api/webhook-dwolla`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dwolla-Signature': `sha256=${signature}`,
        'User-Agent': 'Dwolla/2.0'
      },
      body: JSON.stringify(webhookPayload)
    });

    const responseData = await response.json();

    if (response.ok) {
      log('✅ Webhook Processing - SUCCESS', 'success');
      log(`Response: ${JSON.stringify(responseData, null, 2)}`, 'info');
      testResults.webhookHandling = { success: true, data: responseData };
      return { success: true, data: responseData };
    } else {
      log('❌ Webhook Processing - FAILED', 'error');
      log(`Status: ${response.status}`, 'error');
      log(`Error: ${JSON.stringify(responseData, null, 2)}`, 'error');
      testResults.webhookHandling = { success: false, error: responseData };
      return { success: false, error: responseData };
    }
  } catch (error) {
    log('❌ Webhook Processing - NETWORK ERROR', 'error');
    log(`Error: ${error.message}`, 'error');
    testResults.webhookHandling = { success: false, error: error.message };
    return { success: false, error: error.message };
  }
}

// Test 4: Verify Company Creation
async function testCompanyCreation(paymentData) {
  log('🧪 TEST 4: Testing Company Creation', 'info');

  if (!paymentData.success) {
    log('⏭️  Skipping company creation test - payment processing failed', 'warning');
    return { success: false, error: 'Payment processing prerequisite failed' };
  }

  // In a real scenario, this would be triggered by the webhook
  // For testing, we'll call it directly
  const companyData = {
    paymentId: paymentData.data.paymentId || 'test-payment-id',
    companyEmail: TEST_COMPANY.companyEmail,
    companyName: TEST_COMPANY.companyName,
    dwollaCustomerId: paymentData.data.customerId || 'test-customer-id',
    accountHolderName: TEST_COMPANY.accountHolderName
  };

  const result = await makeRequest('/api/create-company', companyData, 'Company Creation');

  testResults.companyCreation = result;

  if (result.success) {
    log(`Company ID: ${result.data.companyId}`, 'success');
    log(`User ID: ${result.data.userId}`, 'success');
    log(`Login Email: ${result.data.loginCredentials.email}`, 'success');
    log(`Temporary Password: ${result.data.loginCredentials.temporaryPassword}`, 'warning');
  }

  return result;
}

// Generate Test Report
function generateTestReport() {
  log('📊 GENERATING TEST REPORT', 'info');
  log('='.repeat(50));

  const tests = [
    { name: 'Customer Creation', result: testResults.customerCreation },
    { name: 'Payment Processing', result: testResults.paymentProcessing },
    { name: 'Webhook Handling', result: testResults.webhookHandling },
    { name: 'Company Creation', result: testResults.companyCreation }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  tests.forEach((test, index) => {
    const status = test.result?.success ? '✅ PASS' : '❌ FAIL';
    const color = test.result?.success ? 'success' : 'error';

    log(`${index + 1}. ${test.name}: ${status}`, color);

    if (test.result?.success) {
      passedTests++;
    } else if (test.result?.error) {
      log(`   Error: ${typeof test.result.error === 'object' ? JSON.stringify(test.result.error) : test.result.error}`, 'error');
    }
  });

  log('='.repeat(50));
  log(`SUMMARY: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'success' : 'warning');

  if (passedTests === totalTests) {
    log('🎉 ALL TESTS PASSED! The Dwolla integration is working correctly.', 'success');
  } else {
    log('⚠️  Some tests failed. Check the logs above for details.', 'warning');
  }

  // Additional recommendations
  log('\n📋 NEXT STEPS:', 'info');
  if (testResults.customerCreation?.success) {
    log('✓ Customer creation is working', 'success');
  } else {
    log('• Fix customer creation issues (check Dwolla API keys)', 'error');
  }

  if (testResults.paymentProcessing?.success) {
    log('✓ Payment processing is working', 'success');
  } else {
    log('• Fix payment processing (check funding source setup)', 'error');
  }

  if (testResults.webhookHandling?.success) {
    log('✓ Webhook handling is working', 'success');
  } else {
    log('• Fix webhook signature verification', 'error');
  }

  if (testResults.companyCreation?.success) {
    log('✓ Company creation is working', 'success');
  } else {
    log('• Fix Supabase integration (check database schema)', 'error');
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 STARTING TRADE-SPHERE DWOLLA INTEGRATION TESTS', 'info');
  log(`Testing against: ${BASE_URL}`, 'info');
  log(`Test Company: ${TEST_COMPANY.companyEmail}`, 'info');
  log('='.repeat(70));

  try {
    // Run tests in sequence
    const customerResult = await testCreateDwollaCustomer();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const paymentResult = await testProcessPayment(customerResult);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const webhookResult = await testWebhookHandling(paymentResult);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const companyResult = await testCompanyCreation(paymentResult);

    // Generate final report
    generateTestReport();

  } catch (error) {
    log(`💥 Test suite crashed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.length > 2) {
  const testName = process.argv[2];

  switch (testName) {
    case 'customer':
      testCreateDwollaCustomer().then(() => process.exit(0));
      break;
    case 'payment':
      // You would need to pass customer data for this
      log('Use: node test-dwolla-flow.js (runs all tests in sequence)', 'warning');
      process.exit(1);
      break;
    case 'webhook':
      testWebhookHandling({ success: true, data: { transferId: 'test-transfer' } }).then(() => process.exit(0));
      break;
    case 'company':
      testCompanyCreation({ success: true, data: { paymentId: 'test-payment' } }).then(() => process.exit(0));
      break;
    default:
      log('Available test options: customer, webhook, company', 'info');
      log('Run without arguments to execute full test suite', 'info');
      process.exit(1);
  }
} else {
  // Run full test suite
  runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}