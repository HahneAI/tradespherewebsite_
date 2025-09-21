# Trade-Sphere Netlify Functions Setup

## Overview
This project includes Netlify Functions for processing Dwolla ACH payments and creating company accounts. The system handles the complete flow from customer onboarding to payment processing and company creation.

## Architecture Flow
1. **Customer Creation** → Create Dwolla customer and funding source
2. **Payment Processing** → Initiate ACH transfer for $2,000/month subscription
3. **Webhook Handling** → Process Dwolla events and trigger company creation
4. **Company Creation** → Create Supabase records and user accounts

## Prerequisites

### 1. Dwolla Setup
- Create a Dwolla developer account
- Set up a sandbox/production application
- Configure webhook endpoints
- Get your app key and secret

### 2. Supabase Setup
- Create a Supabase project
- Run the database schema from `database-schema.sql`
- Get your project URL and service role key
- Configure RLS policies

### 3. Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Dwolla Configuration
DWOLLA_APP_KEY=your_dwolla_app_key_here
DWOLLA_APP_SECRET=your_dwolla_app_secret_here
DWOLLA_ENVIRONMENT=sandbox  # or 'production'
DWOLLA_WEBHOOK_SECRET=your_webhook_secret_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Application Configuration
FRONTEND_URL=http://localhost:5173  # or your deployed URL
COMPANY_FUNDING_SOURCE_URL=your_company_dwolla_funding_source_url
```

## Database Schema
Execute the SQL in `database-schema.sql` in your Supabase SQL editor to create:
- `companies` table
- `users` table
- `payments` table
- RLS policies
- Indexes

## Netlify Functions

### `/api/create-dwolla-customer`
**Purpose**: Creates Dwolla customer and bank account funding source
**Method**: POST
**Input**:
```json
{
  "companyEmail": "admin@company.com",
  "companyName": "Company Inc",
  "routingNumber": "123456789",
  "accountNumber": "1234567890",
  "accountType": "checking",
  "accountHolderName": "John Doe"
}
```

### `/api/process-payment`
**Purpose**: Initiates $2,000 ACH payment
**Method**: POST
**Input**:
```json
{
  "customerId": "dwolla-customer-id",
  "customerFundingSourceUrl": "https://api.dwolla.com/funding-sources/...",
  "amount": 2000,
  "companyEmail": "admin@company.com",
  "companyName": "Company Inc"
}
```

### `/api/create-company`
**Purpose**: Creates company and user accounts (triggered by webhook)
**Method**: POST
**Input**:
```json
{
  "paymentId": "payment-uuid",
  "companyEmail": "admin@company.com",
  "companyName": "Company Inc",
  "dwollaCustomerId": "dwolla-customer-id",
  "accountHolderName": "John Doe"
}
```

### `/api/webhook-dwolla`
**Purpose**: Handles Dwolla webhook events
**Method**: POST
**Headers**: `X-Dwolla-Signature` for verification

## Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 3. Start Development Server
```bash
netlify dev
```

This will start both the frontend (Vite) and the Netlify functions locally.

### 4. Test Functions
Functions will be available at:
- `http://localhost:8888/api/create-dwolla-customer`
- `http://localhost:8888/api/process-payment`
- `http://localhost:8888/api/create-company`
- `http://localhost:8888/api/webhook-dwolla`

## Deployment

### 1. Deploy to Netlify
```bash
netlify deploy --build
netlify deploy --prod --build
```

### 2. Configure Environment Variables
In Netlify dashboard → Site settings → Environment variables, add all the variables from your `.env` file.

### 3. Configure Dwolla Webhooks
In your Dwolla dashboard, set the webhook URL to:
`https://your-site.netlify.app/api/webhook-dwolla`

Subscribe to these events:
- `transfer_completed`
- `transfer_failed`
- `transfer_cancelled`
- `customer_funding_source_verified`
- `customer_funding_source_negative`

## Security Considerations

1. **Environment Variables**: Never commit sensitive keys to repository
2. **Webhook Verification**: All webhooks verify Dwolla signatures
3. **Input Validation**: All functions use Zod for input validation
4. **RLS Policies**: Supabase tables have Row Level Security enabled
5. **CORS**: Configured to allow frontend domain only

## Error Handling

Functions include comprehensive error handling for:
- Validation errors (400)
- Dwolla API errors (400)
- Database errors (500)
- Authentication errors (401)
- Method not allowed (405)

## Testing

### 1. Unit Testing
Test individual functions locally with sample payloads.

### 2. Integration Testing
Use Dwolla sandbox environment for end-to-end testing.

### 3. Webhook Testing
Use ngrok or Netlify dev for local webhook testing:
```bash
netlify dev
# Then use ngrok to expose webhook endpoint
ngrok http 8888
```

## Monitoring

Monitor function logs in:
- Netlify dashboard → Functions tab
- Dwolla dashboard → Webhooks section
- Supabase dashboard → Logs

## Support

For issues:
1. Check Netlify function logs
2. Verify Dwolla sandbox/production environment
3. Confirm Supabase table structure and RLS policies
4. Test webhook signature verification