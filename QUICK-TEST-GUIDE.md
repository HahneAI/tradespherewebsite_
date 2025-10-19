# Quick Test Guide - Registration Flow

## 🚀 Quick Start (3 Steps)

### 1. Start Server
```bash
netlify dev
```
Wait for: `Server now ready on http://localhost:8888`

### 2. Install Dependencies (first time only)
```bash
npm install
```

### 3. Run Tests
```bash
npm run test:registration
```

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `npm run test:registration` | Run all tests |
| `npm run test:registration:cleanup` | Run all tests + cleanup data |
| `npm run test:registration:validation` | Test form validation only |
| `npm run test:registration:api` | Test API integration only |
| `npm run test:registration:database` | Test database operations only |
| `npm run test:registration:dwolla` | Test Dwolla integration only |

## ✅ Test Categories

### A. Form Validation (10 tests)
- Empty form, invalid email, short password
- Invalid routing number, unchecked agreements
- Invalid plan, missing fields

### B. API Integration (7 tests)
- HTTP methods, duplicate emails
- Complete E2E flow, all plan tiers
- All business types

### C. Database (5 tests)
- Company & user records
- Trial period, payment status
- Plan pricing

### D. Dwolla Integration (5 tests)
- Valid/invalid routing numbers
- Customer & funding source creation
- Micro-deposits

## 🎯 Expected Results

**All Passing:**
```
Total Tests: 27
Passed: 27
Failed: 0
Skipped: 0
```

**Partial (missing credentials):**
```
Total Tests: 27
Passed: 10
Failed: 0
Skipped: 17
```

## 🔧 Quick Troubleshooting

### ❌ "Server is not running"
```bash
# In separate terminal:
netlify dev
```

### ❌ "Missing required credentials"
Check `.env` file has:
- `DWOLLA_APP_KEY`
- `DWOLLA_APP_SECRET`
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### ❌ Tests failing unexpectedly
```bash
# Clean up and retry:
npm run test:registration:cleanup
```

## 📊 Color Guide

- 🟢 **Green (✓)** = Test passed
- 🔴 **Red (✗)** = Test failed
- 🟡 **Yellow (⊘)** = Test skipped

## 🧹 Cleanup Test Data

```bash
# After running tests:
npm run test:registration:cleanup
```

## 🔍 Test Specific Category

```bash
# Only validation tests (fastest):
npm run test:registration:validation

# Only API tests:
npm run test:registration:api

# Only database tests:
npm run test:registration:database

# Only Dwolla tests:
npm run test:registration:dwolla
```

## 📝 Test Data

### Dwolla Test Routing Numbers
- **Valid:** `222222226`
- **Invalid:** `111111116`

### Test Emails
Auto-generated: `test-1634567890123-456@tradesphere-test.com`

### Plans Tested
- `standard` ($20/month)
- `pro` ($35/month)
- `enterprise` ($50/month)

### Business Types Tested
- `llc`
- `corporation`
- `partnership`
- `soleProprietorship`

## 📖 Full Documentation

See `TEST-REGISTRATION-README.md` for complete documentation.

## 🆘 Need Help?

1. Check `.env` configuration
2. Verify server is running (`netlify dev`)
3. Review test output for specific errors
4. See `TEST-REGISTRATION-README.md` troubleshooting section

---

**Quick Tip:** Always run `npm run test:registration:cleanup` to remove test data and keep your database clean!
