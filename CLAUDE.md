# CLAUDE.md - Tradesphere Website Development Instructions

## 🎯 Project Overview

**Repository**: Tradesphere Marketing Website
**Purpose**: Public-facing marketing and lead generation website for the Tradesphere SaaS CRM platform
**Product**: AI-powered CRM for field service companies (landscaping, HVAC, construction, home services)

### Key Context
- This is the **WEBSITE REPO**, not the app repo
- Primary focus: Landing pages, SEO, lead generation, payment onboarding
- Shares database with main app via Supabase for payment/company creation sync
- Handles initial customer onboarding and payment processing before app access

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4
- **Routing**: React Router DOM 7.9
- **UI Components**: Custom components in `src/components/`
- **Icons**: Lucide React

### Backend/Functions
- **Platform**: Netlify Functions (serverless)
- **Runtime**: Node.js
- **Payment Processing**: Dwolla v2 (ACH payments)
- **Database**: Supabase (PostgreSQL) - shared with main app
- **Validation**: Zod 3.22

### Architecture
- **Deployment**: Netlify (static site + serverless functions)
- **Functions Directory**: `.netlify/functions/`
- **Database Access**: Supabase client via `@supabase/supabase-js`
- **Payment Flow**: Dwolla → Webhooks → Supabase → Company Creation

---

## 📁 Project Structure

```
tradespherewebsite_-main/
├── src/
│   ├── components/           # React components
│   │   ├── Hero.tsx         # Landing page hero
│   │   ├── Features.tsx     # Product features
│   │   ├── Pricing.tsx      # Pricing plans & comparison
│   │   ├── HowItWorks.tsx   # Process explanation
│   │   ├── Testimonials.tsx # Customer testimonials
│   │   ├── About.tsx        # About section
│   │   ├── Contact.tsx      # Contact form
│   │   └── Footer.tsx       # Site footer
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles
├── .netlify/functions/       # Serverless functions
│   ├── create-dwolla-customer.js    # Create Dwolla customer
│   ├── process-payment.js           # Process ACH payment
│   ├── webhook-dwolla.js            # Dwolla webhook handler
│   └── create-company.js            # Create company in Supabase
├── public/                   # Static assets
├── index.html               # HTML entry point
├── database-schema.sql      # Shared database schema
├── netlify.toml            # Netlify configuration
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
├── WEBSITE-PRIORITY-AGENTS.md  # Agent reference guide
└── .env.example            # Environment variables template
```

---

## 🔑 Environment Variables

The site requires these environment variables (stored in Netlify dashboard):

```bash
# Dwolla Configuration
DWOLLA_APP_KEY=              # Dwolla application key
DWOLLA_APP_SECRET=           # Dwolla application secret
DWOLLA_ENVIRONMENT=sandbox   # 'sandbox' or 'production'
DWOLLA_WEBHOOK_SECRET=       # Webhook signature verification

# Supabase Configuration (SHARED WITH MAIN APP)
SUPABASE_URL=               # Supabase project URL
SUPABASE_SERVICE_KEY=       # Service role key (admin access)

# Application Configuration
FRONTEND_URL=               # Website URL
COMPANY_FUNDING_SOURCE_URL= # Tradesphere Dwolla funding source
```

**CRITICAL**: Never commit `.env` file. Use `.env.example` as template.

---

## 🗄️ Database Architecture

### Shared Supabase Database
This website shares a Supabase PostgreSQL database with the main Tradesphere app to enable:
- Payment verification before app access
- Seamless company creation and user provisioning
- Subscription status synchronization

### Database Tables (Relevant to Website)
1. **`companies`** - Company accounts created after payment
   - `id`, `name`, `email`, `dwolla_customer_id`, `payment_id`
   - `status`, `subscription_status`, timestamps

2. **`users`** - User accounts (linked to Supabase Auth)
   - `id` (references auth.users), `company_id`, `email`, `full_name`
   - `role` ('owner', 'user'), `status`, timestamps

3. **`payments`** - Payment transaction records
   - `id`, `company_id`, `company_email`, `company_name`
   - `dwolla_customer_id`, `dwolla_transfer_id`, `amount`
   - `status` ('pending', 'processed', 'failed'), timestamps

### Row Level Security (RLS)
All tables have RLS enabled. Website functions use `SUPABASE_SERVICE_KEY` to bypass RLS for administrative operations.

**Reference**: [database-schema.sql](database-schema.sql)

---

## 💳 Payment & Onboarding Flow

### Complete User Journey
1. **User visits website** → Views pricing on landing page
2. **User clicks "Request Demo"** → Contact form submission
3. **Payment processing** → Dwolla ACH payment ($2,000/month)
   - Create Dwolla customer (`create-dwolla-customer.js`)
   - Process ACH transfer (`process-payment.js`)
   - Record payment in `payments` table
4. **Webhook notification** → Dwolla sends transfer_completed event
   - Verify webhook signature (`webhook-dwolla.js`)
   - Trigger company creation
5. **Company creation** → Create Supabase records (`create-company.js`)
   - Create company record
   - Create Supabase Auth user
   - Create user profile record
   - Link payment to company
   - Send welcome email (TODO)
6. **User accesses app** → Redirect to main Tradesphere app with credentials

**Reference**: [README-NETLIFY-FUNCTIONS.md](README-NETLIFY-FUNCTIONS.md)

---

## 🎨 Website Content & Sections

### Current Pages/Sections
1. **Hero** - Main landing section with CTA buttons
   - "Start Free Trial" and "Request Demo" buttons
   - Trust indicators (500+ companies)
   - Value proposition highlights

2. **Features** - Product capabilities showcase
   - AI-powered quoting, smart scheduling, crew tracking
   - Real-time insights, mobile access, integrations

3. **How It Works** - Process explanation
   - Step-by-step customer journey
   - Implementation timeline

4. **Pricing** - Subscription tiers
   - Starter ($99/month), Growth ($299/month), Enterprise (custom)
   - Feature comparison table
   - FAQ section

5. **Testimonials** - Social proof
   - Customer success stories
   - Industry-specific use cases

6. **About** - Company information
   - Mission, vision, team
   - Industry expertise

7. **Contact** - Lead generation form
   - Email capture
   - Demo requests

### SEO Strategy
- Target keywords: "field service CRM", "landscaping CRM", "HVAC CRM", "AI-powered quoting"
- Meta descriptions in `index.html`
- Semantic HTML structure
- Performance optimization (Core Web Vitals)

---

## 🤖 MCP Tools Available

### PostgreSQL MCP Server
**Connected to**: Tradesphere production Supabase database
**Access Level**: Read-only queries via `mcp__postgresql__query`
**Use Cases**:
- Query existing schema before modifications
- Verify payment records
- Check company/user data structure
- Validate RLS policies

**CRITICAL**: Always query live database first before making schema changes or assumptions.

### Filesystem MCP Server
**Capabilities**: Read, write, edit files, directory operations
**Tools**: `mcp__filesystem__*` functions
**Use Cases**:
- File operations across the repository
- Reading/writing component files
- Managing configuration files

### Memory MCP Server
**Capabilities**: Knowledge graph for context persistence
**Tools**: `mcp__memory__*` functions
**Use Cases**:
- Storing project-specific context
- Tracking architectural decisions
- Maintaining conversation history

### Puppeteer Stealth MCP Server
**Capabilities**: Browser automation with stealth mode
**Tools**: `mcp__puppeteer-stealth__*` functions
**Use Cases**:
- Visual regression testing
- Screenshot capture for design reviews
- E2E testing of payment flows

### Sequential Thinking MCP Server
**Capabilities**: Chain-of-thought reasoning
**Tool**: `mcp__sequential-thinking__sequentialthinking`
**Use Cases**:
- Complex problem decomposition
- Multi-step architectural planning

---

## 👥 Priority Agent Reference

Use these specialized agents from [WEBSITE-PRIORITY-AGENTS.md](WEBSITE-PRIORITY-AGENTS.md):

### Frontend Development
1. **frontend-developer** (Sonnet) - React 19, Next.js 15, Tailwind, TypeScript
2. **ui-ux-designer** (Sonnet) - Design systems, wireframes, accessibility
3. **mobile-developer** (Sonnet) - PWA optimization, responsive design

### Backend/Functions
4. **backend-architect** (Opus) - API design, microservices patterns
5. **database-architect** (Opus) - Schema design, **has PostgreSQL MCP access**
6. **database-optimizer** (Opus) - Query optimization, caching

### Security
7. **security-auditor** (Opus) - DevSecOps, OWASP, compliance
8. **frontend-security-coder** (Sonnet) - XSS prevention, CSP
9. **backend-security-coder** (Sonnet) - Input validation, API security

### Performance & Quality
10. **performance-engineer** (Opus) - Core Web Vitals, load testing
11. **observability-engineer** (Opus) - Monitoring, logging, tracing
12. **code-reviewer** (Opus) - Code analysis, **has PostgreSQL MCP access**
13. **test-automator** (Sonnet) - Test automation, TDD
14. **debugger** (Sonnet) - Error resolution, root cause analysis

### SEO Stack
15. **seo-structure-architect** (Sonnet) - Schema markup, internal linking
16. **seo-meta-optimizer** (Sonnet) - Meta tags, SERP optimization
17. **seo-content-writer** (Sonnet) - SEO-optimized content creation
18. **seo-content-auditor** (Sonnet) - Content quality, E-E-A-T

### Common Workflows
**New Landing Page Feature**:
1. ui-ux-designer → Design
2. frontend-developer → Implement
3. mobile-developer → Mobile optimization
4. seo-structure-architect → SEO structure
5. seo-meta-optimizer → Meta tags
6. code-reviewer → Review
7. test-automator → Tests

**Payment Flow Enhancement**:
1. backend-architect → API design
2. database-architect → Schema validation (query via PostgreSQL MCP)
3. backend-security-coder → Security implementation
4. security-auditor → Security audit
5. test-automator → Integration tests
6. code-reviewer → Review

**SEO Optimization**:
1. seo-structure-architect → Structure analysis
2. seo-meta-optimizer → Meta optimization
3. seo-content-writer → Content creation
4. seo-content-auditor → Content audit
5. performance-engineer → Core Web Vitals

---

## 🚀 Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start Vite dev server (frontend only)
npm run dev

# Start Netlify dev server (frontend + functions)
netlify dev
```

### Testing Netlify Functions Locally
Functions available at:
- `http://localhost:8888/api/create-dwolla-customer`
- `http://localhost:8888/api/process-payment`
- `http://localhost:8888/api/create-company`
- `http://localhost:8888/api/webhook-dwolla`

### Building & Deployment
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Netlify
netlify deploy --build       # Preview deploy
netlify deploy --prod --build  # Production deploy
```

### Git Workflow
- **Main branch**: `main` (production)
- **Commit style**: Conventional commits
- **PR process**: Create feature branch → PR to main

---

## 🔒 Security Guidelines

### Critical Security Rules
1. **Never commit secrets** - Use environment variables only
2. **Validate all inputs** - Use Zod schemas in functions
3. **Verify webhooks** - Always verify Dwolla signatures
4. **Use RLS policies** - Leverage Supabase RLS for data access
5. **Service key usage** - Only use `SUPABASE_SERVICE_KEY` in serverless functions
6. **CORS configuration** - Restrict to production domain in production
7. **XSS prevention** - Sanitize user inputs in React components
8. **SQL injection** - Use Supabase parameterized queries
9. **Rate limiting** - Implement on payment endpoints
10. **HTTPS only** - Enforce in production

### Security Checklist for New Features
- [ ] Input validation with Zod
- [ ] XSS prevention in frontend
- [ ] SQL injection prevention in queries
- [ ] CORS properly configured
- [ ] Environment variables, not hardcoded secrets
- [ ] Error messages don't expose sensitive data
- [ ] Rate limiting on API endpoints
- [ ] RLS policies verified

**Use security agents proactively**: security-auditor, frontend-security-coder, backend-security-coder

---

## 📊 Performance Guidelines

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Optimization Strategies
1. **Code splitting** - Lazy load components with React.lazy()
2. **Image optimization** - Use WebP, lazy loading, responsive images
3. **CSS optimization** - Tailwind purge, critical CSS inline
4. **JavaScript optimization** - Tree shaking, minification
5. **Caching** - Leverage CDN, browser caching, service workers
6. **Font optimization** - Font display swap, subset fonts

**Use performance-engineer agent for optimization audits**

---

## 🧪 Testing Strategy

### Frontend Testing
- **Unit tests**: React components with Vitest
- **Integration tests**: User flows with Playwright
- **Visual regression**: Puppeteer screenshots
- **Accessibility**: WCAG 2.1 AA compliance

### Backend Testing
- **Unit tests**: Netlify functions with sample payloads
- **Integration tests**: Dwolla sandbox environment
- **Webhook testing**: ngrok + Netlify dev

### Payment Flow Testing
1. Use Dwolla sandbox credentials
2. Test complete onboarding flow
3. Verify webhook signature validation
4. Test company creation rollback on errors
5. Verify Supabase records created correctly

**Use test-automator agent for test generation**

---

## 🐛 Debugging Guidelines

### Common Issues
1. **Function errors** - Check Netlify function logs
2. **Dwolla issues** - Verify sandbox/production environment
3. **Database errors** - Check Supabase logs, verify RLS policies
4. **Webhook failures** - Verify signature validation
5. **Payment failures** - Check Dwolla dashboard

### Debugging Tools
- Netlify function logs (dashboard)
- Dwolla dashboard (webhooks, transfers)
- Supabase dashboard (logs, table editor)
- Browser DevTools (React DevTools, Network tab)
- `console.log` in functions (appears in Netlify logs)

**Use debugger agent for root cause analysis**

---

## 📝 Documentation Standards

### Code Comments
- Explain **why**, not **what**
- Document complex business logic
- Add TODOs for future improvements
- Reference external docs when applicable

### Component Documentation
```typescript
/**
 * Pricing component with tiered plans and comparison table
 *
 * Features:
 * - Toggle between card view and comparison table
 * - Scroll to contact form on CTA click
 * - Responsive grid layout
 *
 * Plans: Starter ($99), Growth ($299), Enterprise (custom)
 */
```

### Function Documentation
```javascript
/**
 * Creates Dwolla customer and bank funding source
 *
 * @param {Object} body - Request body
 * @param {string} body.companyEmail - Company admin email
 * @param {string} body.companyName - Company legal name
 * @param {string} body.routingNumber - Bank routing number
 * @param {string} body.accountNumber - Bank account number
 *
 * @returns {Object} - Dwolla customer ID and funding source URL
 */
```

---

## 🎯 Project-Specific Best Practices

### React Component Guidelines
1. **Functional components only** - Use hooks, no class components
2. **TypeScript strict mode** - Full type coverage
3. **Prop validation** - Define explicit prop types
4. **Event handlers** - Use inline arrow functions sparingly
5. **State management** - Keep state close to usage
6. **Accessibility** - Semantic HTML, ARIA labels, keyboard nav

### Netlify Function Guidelines
1. **CORS handling** - Include CORS headers in all responses
2. **OPTIONS method** - Handle CORS preflight requests
3. **Error responses** - Return proper HTTP status codes
4. **Validation** - Use Zod schemas for input validation
5. **Logging** - Use console.log for debugging (appears in Netlify logs)
6. **Rollback transactions** - Clean up on partial failures

### Tailwind CSS Guidelines
1. **Utility-first** - Use utility classes over custom CSS
2. **Responsive design** - Mobile-first breakpoints (sm, md, lg, xl)
3. **Color palette** - Use brand colors: blue-600, teal-600, gray-900
4. **Spacing scale** - Consistent spacing (4, 8, 16, 24, 32, 64)
5. **Dark mode** - Not implemented yet (future consideration)

### Database Interaction Guidelines
1. **Always use PostgreSQL MCP first** - Query live database before changes
2. **Parameterized queries** - Never concatenate user input
3. **RLS validation** - Test policies with different user roles
4. **Transactions** - Use for multi-step operations
5. **Error handling** - Graceful rollback on failures

---

## 🚨 Critical Warnings

### DO NOT
- ❌ Commit `.env` file or secrets to repository
- ❌ Use production Dwolla credentials in development
- ❌ Bypass RLS policies without service key
- ❌ Create database schema without querying via PostgreSQL MCP first
- ❌ Deploy without testing payment flow in sandbox
- ❌ Expose service keys in client-side code
- ❌ Process payments without webhook verification
- ❌ Create company records without payment verification

### ALWAYS
- ✅ Query database via PostgreSQL MCP before schema changes
- ✅ Use database-architect or code-reviewer agents (have PostgreSQL MCP access)
- ✅ Validate webhook signatures from Dwolla
- ✅ Use Zod schemas for input validation
- ✅ Test in Dwolla sandbox before production
- ✅ Verify payment success before company creation
- ✅ Implement rollback logic for failed operations
- ✅ Use security agents proactively for new features
- ✅ Test payment flow end-to-end before deployment

---

## 🔗 Key Files Reference

### Configuration
- [netlify.toml](netlify.toml) - Netlify deployment configuration
- [vite.config.ts](vite.config.ts) - Vite build configuration
- [tailwind.config.js](tailwind.config.js) - Tailwind CSS configuration
- [.env.example](.env.example) - Environment variables template

### Documentation
- [README-NETLIFY-FUNCTIONS.md](README-NETLIFY-FUNCTIONS.md) - Functions documentation
- [database-schema.sql](database-schema.sql) - Database schema
- [WEBSITE-PRIORITY-AGENTS.md](WEBSITE-PRIORITY-AGENTS.md) - Agent reference guide
- [PHASE-4-BILLING-ORGANIZATION-ROADMAP.md](PHASE-4-BILLING-ORGANIZATION-ROADMAP.md) - Future roadmap

### Key Components
- [src/components/Hero.tsx](src/components/Hero.tsx) - Landing hero section
- [src/components/Pricing.tsx](src/components/Pricing.tsx) - Pricing tiers
- [src/components/Contact.tsx](src/components/Contact.tsx) - Lead generation form

### Key Functions
- [.netlify/functions/create-dwolla-customer.js](.netlify/functions/create-dwolla-customer.js)
- [.netlify/functions/process-payment.js](.netlify/functions/process-payment.js)
- [.netlify/functions/webhook-dwolla.js](.netlify/functions/webhook-dwolla.js)
- [.netlify/functions/create-company.js](.netlify/functions/create-company.js)

---

## 🎓 Learning Resources

### Dwolla Documentation
- Dwolla API: https://developers.dwolla.com/
- Webhook events: https://developers.dwolla.com/api-reference/webhook-subscriptions
- Sandbox testing: https://developers.dwolla.com/guides/sandbox

### Supabase Documentation
- Supabase JS client: https://supabase.com/docs/reference/javascript
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- Auth admin API: https://supabase.com/docs/reference/javascript/auth-admin

### Netlify Documentation
- Functions: https://docs.netlify.com/functions/overview/
- Environment variables: https://docs.netlify.com/configure-builds/environment-variables/
- Deployment: https://docs.netlify.com/site-deploys/overview/

---

## 🤝 Working with Claude Code

### Effective Agent Usage
1. **Use specialized agents** - Reference WEBSITE-PRIORITY-AGENTS.md
2. **PostgreSQL MCP access** - database-architect and code-reviewer have direct database access
3. **Parallel agent execution** - Launch multiple agents simultaneously when tasks are independent
4. **Sequential workflows** - Follow recommended workflows for complex features
5. **Proactive agent use** - Use security/performance agents before merging

### Prompt Engineering Tips
- Be specific about component/function names
- Reference file paths when discussing code
- Specify whether you want implementation or research
- Mention "query database first" for schema-related tasks
- Request "use PostgreSQL MCP" when database context is needed

### Context Sharing
- This CLAUDE.md file provides all project context
- Reference WEBSITE-PRIORITY-AGENTS.md for agent capabilities
- Use Memory MCP to persist architectural decisions
- Query PostgreSQL MCP for live database schema

---

## 📞 Support & Escalation

### When to Escalate
- Dwolla API authentication issues
- Supabase RLS policy conflicts
- Production payment failures
- Database schema conflicts with main app
- Security vulnerabilities discovered

### Debugging Checklist
1. Check Netlify function logs
2. Verify environment variables in Netlify dashboard
3. Test in Dwolla sandbox first
4. Query Supabase tables via PostgreSQL MCP
5. Review webhook signature verification
6. Test payment flow end-to-end locally
7. Verify CORS configuration

---

## 🏁 Quick Start Checklist

For new Claude Code sessions working on this project:

- [ ] Read this CLAUDE.md file completely
- [ ] Review [WEBSITE-PRIORITY-AGENTS.md](WEBSITE-PRIORITY-AGENTS.md)
- [ ] Query database schema via PostgreSQL MCP (`mcp__postgresql__query`)
- [ ] Check environment variables in `.env.example`
- [ ] Review [README-NETLIFY-FUNCTIONS.md](README-NETLIFY-FUNCTIONS.md)
- [ ] Understand payment flow: website → Dwolla → webhook → company creation
- [ ] Identify relevant specialized agent(s) for the task
- [ ] Launch agent(s) with clear, specific prompts
- [ ] Use PostgreSQL MCP for any database-related work
- [ ] Test locally with `netlify dev` before deployment

---

## 🎯 Current Priorities

Based on [PHASE-4-BILLING-ORGANIZATION-ROADMAP.md](PHASE-4-BILLING-ORGANIZATION-ROADMAP.md):

### Immediate Tasks
1. **Welcome email automation** - Implement email service integration in create-company.js
2. **Contact form integration** - Connect Contact.tsx to CRM or email service
3. **SEO optimization** - Implement schema markup, optimize meta tags
4. **Performance audit** - Run Core Web Vitals analysis
5. **Payment flow testing** - End-to-end testing in Dwolla sandbox

### Near-Term Enhancements
1. **Blog/content section** - SEO-driven content marketing
2. **Case studies page** - Industry-specific success stories
3. **Resource center** - Downloadable guides, whitepapers
4. **Video demos** - Product walkthrough videos
5. **Live chat integration** - Real-time customer support

### Long-Term Goals
1. **A/B testing framework** - Landing page optimization
2. **Multi-language support** - Internationalization (i18n)
3. **Advanced analytics** - Conversion funnel tracking
4. **Referral program** - Customer acquisition via referrals
5. **Partner portal** - Reseller/partner management

---

## 📋 Version History

- **v1.0** (2025-01-16) - Initial CLAUDE.md creation
  - Documented tech stack, architecture, payment flow
  - MCP tools reference
  - Priority agents integration
  - Security and performance guidelines

---

**Remember**: This is the marketing website repo. Main app functionality lives in a separate repository. This site handles lead generation, payment onboarding, and initial company creation only. Always query the shared Supabase database via PostgreSQL MCP before making schema assumptions.
