# Website Priority Agents Reference

This document provides quick access to the **essential agents for Tradesphere SaaS website development**. These are the core agents you'll use most frequently for building and maintaining the web application.

**Purpose**: Streamlined reference for the most critical website development agents, focused on practical daily use.

---

## 🎯 Frontend Stack

### 1. Frontend Developer
**File**: [`agents/frontend-developer.md`](agents/frontend-developer.md) | **Model**: Sonnet

Build React components, implement responsive layouts, and handle client-side state management. Masters React 19, Next.js 15, and modern frontend architecture.

**Key Capabilities**: React 19, Next.js 15, State Management (Zustand, React Query), Tailwind CSS, Core Web Vitals optimization

**When to Use**: Building UI components, implementing TypeScript frontend, responsive layouts, performance optimization

---

### 2. UI/UX Designer
**File**: [`agents/ui-ux-designer.md`](agents/ui-ux-designer.md) | **Model**: Sonnet

Create interface designs, wireframes, and design systems. Masters user research, accessibility standards, and modern design tools.

**Key Capabilities**: Design systems, Figma, user research, WCAG 2.1/2.2 accessibility, component libraries

**When to Use**: Designing interfaces, creating design systems, usability testing, accessibility compliance, wireframes

---

### 3. Mobile Developer
**File**: [`agents/mobile-developer.md`](agents/mobile-developer.md) | **Model**: Sonnet

Expert mobile developer specializing in PWA optimization and mobile-first design. Masters cross-platform development.

**Key Capabilities**: PWA (service workers, offline, install prompts), mobile optimization, responsive design, touch interfaces

**When to Use**: PWA features, mobile browser optimization, responsive testing, future native app preparation

**⚠️ Tradesphere Context**: Currently building PWA. Add comments for future iOS/Android native app adaptations. Document migration points.

---

## 🔧 Backend Stack

### 4. Backend Architect
**File**: [`agents/backend-architect.md`](agents/backend-architect.md) | **Model**: Opus

Expert backend architect specializing in scalable API design, microservices architecture, and distributed systems.

**Key Capabilities**: REST/GraphQL/gRPC APIs, microservices, event-driven architecture, OAuth 2.0/JWT, resilience patterns

**When to Use**: API design, multi-tenant architecture, pricing engine logic, authentication systems, microservices

---

### 5. Database Architect
**File**: [`agents/database-architect.md`](agents/database-architect.md) | **Model**: Opus

Expert database architect with **direct access to Tradesphere production database via PostgreSQL MCP**.

**Key Capabilities**: Schema design, normalization, multi-tenant patterns, indexing strategy, migration planning, Supabase

**When to Use**: Schema design, data modeling, migrations, selecting database technologies, creating ERDs

**⚠️ CRITICAL**: PostgreSQL MCP connected to production Supabase. **Always query live database FIRST** before any architecture work.

---

### 6. Database Optimizer
**File**: [`agents/database-optimizer.md`](agents/database-optimizer.md) | **Model**: Opus

Expert database optimizer specializing in performance tuning, query optimization, and scalable architectures.

**Key Capabilities**: Query optimization, advanced indexing, N+1 resolution, multi-tier caching, partitioning, sharding

**When to Use**: Slow queries, indexing strategies, N+1 problems, caching, multi-tenant data isolation

---

## 🔒 Security Stack

### 7. Security Auditor
**File**: [`agents/security-auditor.md`](agents/security-auditor.md) | **Model**: Opus

Expert security auditor specializing in DevSecOps, cybersecurity, and compliance frameworks.

**Key Capabilities**: DevSecOps (SAST/DAST), OAuth 2.0/OIDC, OWASP Top 10, static/dynamic analysis, compliance (GDPR, SOC 2)

**When to Use**: Security audits, RLS policy validation, authentication systems, DevSecOps pipelines, compliance

---

### 8. Frontend Security Coder
**File**: [`agents/frontend-security-coder.md`](agents/frontend-security-coder.md) | **Model**: Sonnet

Expert in secure frontend coding practices specializing in XSS prevention and client-side security.

**Key Capabilities**: XSS prevention, Content Security Policy, secure storage, token handling, OAuth implementation

**When to Use**: Secure frontend features, client-side security reviews, CSP setup, sensitive data handling

---

### 9. Backend Security Coder
**File**: [`agents/backend-security-coder.md`](agents/backend-security-coder.md) | **Model**: Sonnet

Expert in secure backend coding practices specializing in input validation and API security.

**Key Capabilities**: Input validation, JWT/OAuth, RBAC/ABAC, rate limiting, SQL injection prevention

**When to Use**: Secure backend APIs, authentication/authorization, input validation, multi-tenant security

---

## ⚡ Performance & Quality

### 10. Performance Engineer
**File**: [`agents/performance-engineer.md`](agents/performance-engineer.md) | **Model**: Opus

Expert performance engineer specializing in Core Web Vitals, load testing, and optimization.

**Key Capabilities**: Core Web Vitals (LCP, FID, CLS), load testing (k6, Gatling), multi-tier caching, OpenTelemetry

**When to Use**: Core Web Vitals optimization, load testing, caching strategies, performance bottlenecks

---

### 11. Observability Engineer
**File**: [`agents/observability-engineer.md`](agents/observability-engineer.md) | **Model**: Opus

Build production-ready monitoring, logging, and tracing systems. SLI/SLO management and incident response.

**Key Capabilities**: Monitoring (Prometheus, Grafana), structured logging, distributed tracing, SLI/SLO, alerting

**When to Use**: Monitoring infrastructure, dashboards, distributed tracing, SLIs/SLOs, incident response

---

## 🧪 Testing Stack

### 12. Code Reviewer
**File**: [`agents/code-reviewer.md`](agents/code-reviewer.md) | **Model**: Opus

Elite code review expert with **access to Tradesphere production database via PostgreSQL MCP**.

**Key Capabilities**: AI-powered analysis, static analysis (SonarQube, CodeQL), security review, performance analysis, TDD compliance

**When to Use**: Code reviews, security analysis, performance implications, configuration validation

**⚠️ CRITICAL**: Can validate database-related code against actual production schema via PostgreSQL MCP.

---

### 13. Test Automator
**File**: [`agents/test-automator.md`](agents/test-automator.md) | **Model**: Sonnet

Master AI-powered test automation with modern frameworks and comprehensive quality engineering.

**Key Capabilities**: TDD automation, AI-powered testing, Playwright/Selenium, CI/CD integration, performance testing

**When to Use**: Test generation for pricing calculations, RLS policies, test automation frameworks, load tests

---

### 14. Debugger
**File**: [`agents/debugger.md`](agents/debugger.md) | **Model**: Sonnet

Debugging specialist for errors, test failures, and unexpected behavior. Root cause analysis and minimal fixes.

**Key Capabilities**: Stack trace interpretation, root cause analysis, strategic logging, minimal fixes, regression prevention

**When to Use**: Debugging errors, analyzing stack traces, finding root causes, production issues

---

## 🔍 SEO Stack

### 15. SEO Structure Architect
**File**: [`agents/seo-structure-architect.md`](agents/seo-structure-architect.md) | **Model**: Sonnet

Analyzes and optimizes content structure including header hierarchy, schema markup, and internal linking.

**Key Capabilities**: H1-H6 optimization, schema markup (JSON-LD), internal linking, URL structure, XML sitemaps

**When to Use**: Structuring pages, implementing schema markup, internal linking strategy, technical SEO

---

### 16. SEO Meta Optimizer
**File**: [`agents/seo-meta-optimizer.md`](agents/seo-meta-optimizer.md) | **Model**: Sonnet

Creates optimized meta titles, descriptions, and URLs. Generates compelling, keyword-rich metadata.

**Key Capabilities**: Meta titles/descriptions, URL structure, Open Graph tags, Twitter cards, SERP preview

**When to Use**: Creating meta tags, optimizing metadata, improving CTR from search results, social media tags

---

### 17. SEO Content Writer
**File**: [`agents/seo-content-writer.md`](agents/seo-content-writer.md) | **Model**: Sonnet

Writes SEO-optimized content based on keywords and topic briefs. Creates engaging, comprehensive content.

**Key Capabilities**: Long-form content, natural keyword integration, compelling copy, optimal readability, E-E-A-T principles

**When to Use**: Writing blog posts, landing pages, product descriptions, SEO-friendly copy

---

### 18. SEO Content Auditor
**File**: [`agents/seo-content-auditor.md`](agents/seo-content-auditor.md) | **Model**: Sonnet

Analyzes content for quality, E-E-A-T signals, and SEO best practices. Scores content and provides recommendations.

**Key Capabilities**: Quality analysis, E-E-A-T signals, technical SEO, content scoring, actionable recommendations

**When to Use**: Auditing content quality, identifying improvements, E-E-A-T compliance, pre-publication scoring

---

## Quick Reference Table

| # | Agent | Model | Primary Use |
|---|-------|-------|-------------|
| 1 | **frontend-developer** | Sonnet | React/Next.js components |
| 2 | **ui-ux-designer** | Sonnet | Design systems & wireframes |
| 3 | **mobile-developer** | Sonnet | PWA & mobile optimization |
| 4 | **backend-architect** | Opus | API design & microservices |
| 5 | **database-architect** | Opus | Schema design (live DB access) |
| 6 | **database-optimizer** | Opus | Query performance & caching |
| 7 | **security-auditor** | Opus | Security audits & compliance |
| 8 | **frontend-security-coder** | Sonnet | XSS prevention & client security |
| 9 | **backend-security-coder** | Sonnet | Input validation & API security |
| 10 | **performance-engineer** | Opus | Core Web Vitals & optimization |
| 11 | **observability-engineer** | Opus | Monitoring & distributed tracing |
| 12 | **code-reviewer** | Opus | Code reviews (live DB access) |
| 13 | **test-automator** | Sonnet | Test generation & automation |
| 14 | **debugger** | Sonnet | Error resolution & root cause |
| 15 | **seo-structure-architect** | Sonnet | Schema markup & structure |
| 16 | **seo-meta-optimizer** | Sonnet | Meta tags & URLs |
| 17 | **seo-content-writer** | Sonnet | SEO-optimized content |
| 18 | **seo-content-auditor** | Sonnet | Content quality & E-E-A-T |

---

## Common Workflows

### 🎨 New Feature
1. **ui-ux-designer** → Design
2. **frontend-developer** → Implement
3. **mobile-developer** → Optimize for mobile
4. **backend-architect** → Design APIs
5. **database-architect** → Schema changes
6. **test-automator** → Tests
7. **code-reviewer** → Review

### 🔒 Security
1. **security-auditor** → Audit
2. **backend-security-coder** → Backend implementation
3. **frontend-security-coder** → Frontend implementation
4. **code-reviewer** → Security review
5. **test-automator** → Security tests

### ⚡ Performance
1. **performance-engineer** → Identify bottlenecks
2. **database-optimizer** → Optimize queries
3. **frontend-developer** → Optimize frontend
4. **mobile-developer** → Mobile performance
5. **observability-engineer** → Monitoring

### 🔍 SEO
1. **seo-structure-architect** → Structure & schema
2. **seo-meta-optimizer** → Meta tags
3. **seo-content-writer** → Write content
4. **seo-content-auditor** → Audit & score

---

## Tradesphere-Specific Notes

### Database Access
- **database-architect** and **code-reviewer** have PostgreSQL MCP → production Supabase
- Always query live database before schema work
- Use read-only queries to validate assumptions

### PWA Focus
- **mobile-developer** is primary for PWA implementation
- Document future native app migration points with comments
- Works with **ui-ux-designer** for mobile-responsive design

### Multi-Tenant Architecture
- **backend-architect** for multi-tenant patterns
- **database-optimizer** for RLS policy performance
- **security-auditor** for tenant isolation

### Pricing Engine
- **typescript-pro** for type-safe calculations
- **test-automator** for comprehensive pricing tests
- **backend-architect** for pricing API design

---

## See Also

- [PRIORITY_AGENTS.md](PRIORITY_AGENTS.md) - Original priority agents (general development)
- [CLAUDE.md](CLAUDE.md) - Safety guide and configuration instructions
- [agents/README.md](agents/README.md) - Complete agent documentation (all 84 agents)
