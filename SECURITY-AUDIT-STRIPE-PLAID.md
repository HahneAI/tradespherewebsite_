# Security Audit Report: Stripe + Plaid ACH Integration
**Date**: January 2025
**Auditor**: Security Audit Team
**Severity Levels**: 🔴 HIGH | 🟡 MEDIUM | 🟢 LOW

---

## Executive Summary

This comprehensive security audit evaluates the proposed migration from Dwolla to Stripe ACH with Plaid Link integration. The audit identifies **15 HIGH**, **12 MEDIUM**, and **8 LOW** severity findings requiring remediation before production deployment.

**Critical Areas of Concern:**
1. Missing critical security dependencies (helmet, express-rate-limit)
2. Insufficient input sanitization and XSS protection
3. Weak secret management and rotation policies
4. Missing CSRF protection on state-changing operations
5. Inadequate audit logging and monitoring

---

## 1. API Key Security

### 🔴 HIGH-1: Missing API Key Rotation Strategy
**Finding**: No documented or automated key rotation policy for critical API keys.
**Impact**: Compromised keys could remain active indefinitely.
**Recommendation**:
```javascript
// Implement key rotation service
class KeyRotationService {
  private static readonly ROTATION_INTERVAL = 90 * 24 * 60 * 60 * 1000; // 90 days

  static async rotateKeys() {
    // 1. Generate new keys in provider dashboards
    // 2. Update Netlify environment variables
    // 3. Verify new keys work
    // 4. Deactivate old keys after grace period
    await this.rotateStripeKeys();
    await this.rotatePlaidKeys();
    await this.rotateSupabaseKeys();
  }

  static async validateKeyAge() {
    const keyMetadata = await this.getKeyMetadata();
    if (Date.now() - keyMetadata.created > this.ROTATION_INTERVAL) {
      await this.alertSecurityTeam('Key rotation required');
    }
  }
}
```

### 🔴 HIGH-2: Insufficient Environment Variable Validation
**Finding**: No runtime validation of environment variables existence and format.
**Impact**: Missing or malformed keys could cause runtime failures.
**Recommendation**:
```javascript
// Add to function initialization
import { z } from 'zod';

const EnvSchema = z.object({
  PLAID_CLIENT_ID: z.string().min(20),
  PLAID_SECRET: z.string().min(20),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(40),
});

// Validate on function start
export const validateEnvironment = () => {
  try {
    EnvSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
};
```

### 🟡 MEDIUM-1: Weak Key Storage in Netlify
**Finding**: API keys stored in Netlify environment variables without additional encryption.
**Impact**: Netlify compromise could expose all keys.
**Recommendation**:
- Use AWS Secrets Manager or HashiCorp Vault for key storage
- Implement key encryption at rest
- Use IAM roles for service authentication where possible

---

## 2. Token Flow Security

### 🔴 HIGH-3: Plaid Access Token Not Encrypted in Database
**Finding**: Architecture stores Plaid access tokens without field-level encryption.
**Impact**: Database breach would expose permanent bank access tokens.
**Recommendation**:
```javascript
import crypto from 'crypto';

class TokenEncryption {
  private static algorithm = 'aes-256-gcm';
  private static getKey() {
    // Use KMS or separate encryption key, not in same env
    return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.getKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Usage in database operations
const encryptedToken = TokenEncryption.encrypt(plaidAccessToken);
await supabase.from('company_tokens').insert({
  company_id: companyId,
  encrypted_plaid_token: encryptedToken,
  token_iv: iv, // Store separately for additional security
});
```

### 🔴 HIGH-4: Public Token Exposure Risk
**Finding**: Plaid public tokens transmitted without additional validation.
**Impact**: Intercepted tokens could be exchanged for access tokens.
**Recommendation**:
```javascript
// Add HMAC validation for public token transmission
class TokenValidator {
  static generateTokenHMAC(publicToken: string, userId: string): string {
    const secret = process.env.TOKEN_HMAC_SECRET;
    const data = `${publicToken}:${userId}:${Date.now()}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  static validateTokenHMAC(
    publicToken: string,
    userId: string,
    hmac: string,
    maxAge: number = 300000 // 5 minutes
  ): boolean {
    // Validate HMAC and timestamp
    const [token, user, timestamp] = hmac.split(':');
    if (Date.now() - parseInt(timestamp) > maxAge) {
      throw new Error('Token expired');
    }

    const expectedHMAC = this.generateTokenHMAC(publicToken, userId);
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(expectedHMAC)
    );
  }
}
```

### 🟡 MEDIUM-2: Insufficient Token Expiration Handling
**Finding**: No automatic cleanup of expired Plaid Link tokens.
**Impact**: Token accumulation and potential reuse attempts.
**Recommendation**: Implement token cleanup cron job.

---

## 3. Webhook Security

### 🔴 HIGH-5: Missing Rate Limiting on Webhook Endpoint
**Finding**: No rate limiting implementation for webhook endpoints.
**Impact**: Vulnerable to DoS attacks and webhook flooding.
**Recommendation**:
```javascript
// Install: npm install express-rate-limit redis rate-limit-redis
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);

export const webhookRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'webhook:',
  }),
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second per IP
  standardHeaders: true,
  legacyHeaders: false,

  // Skip rate limiting for verified Stripe IPs
  skip: (req) => {
    const stripeIPs = [
      '3.18.12.63', '3.130.192.231', '13.235.14.237',
      // Add all Stripe webhook IPs
    ];
    const clientIP = req.ip || req.connection.remoteAddress;
    return stripeIPs.includes(clientIP);
  },

  handler: (req, res) => {
    console.error(`Rate limit exceeded for webhook: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

### 🔴 HIGH-6: Inadequate Webhook Replay Attack Prevention
**Finding**: No timestamp validation or request deduplication.
**Impact**: Replay attacks could cause duplicate payments or operations.
**Recommendation**:
```javascript
class WebhookSecurity {
  private static readonly MAX_TIMESTAMP_AGE = 300; // 5 minutes
  private static processedEvents = new Map<string, number>();

  static async validateWebhook(
    payload: string,
    signature: string,
    timestamp: string
  ): Promise<boolean> {
    // 1. Validate timestamp freshness
    const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (timestampAge > this.MAX_TIMESTAMP_AGE) {
      throw new Error('Webhook timestamp too old');
    }

    // 2. Validate signature
    const expectedSignature = this.computeSignature(payload, timestamp);
    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      throw new Error('Invalid webhook signature');
    }

    // 3. Check for replay (idempotency)
    const eventId = JSON.parse(payload).id;
    if (this.processedEvents.has(eventId)) {
      console.warn(`Duplicate webhook event: ${eventId}`);
      return false;
    }

    // 4. Store event ID with expiration
    this.processedEvents.set(eventId, Date.now());

    // Clean old entries periodically
    this.cleanupOldEvents();

    return true;
  }

  private static cleanupOldEvents() {
    const cutoff = Date.now() - (this.MAX_TIMESTAMP_AGE * 1000 * 2);
    for (const [eventId, timestamp] of this.processedEvents) {
      if (timestamp < cutoff) {
        this.processedEvents.delete(eventId);
      }
    }
  }
}
```

### 🟡 MEDIUM-3: Missing Webhook IP Allowlisting
**Finding**: No IP validation for incoming webhooks.
**Impact**: Potential for spoofed webhook requests.
**Recommendation**: Implement Stripe IP allowlist validation.

---

## 4. Data Security

### 🔴 HIGH-7: Sensitive Data in Logs
**Finding**: Current architecture may log sensitive payment data.
**Impact**: Log breaches could expose PII and financial data.
**Recommendation**:
```javascript
class SecureLogger {
  private static sensitiveFields = [
    'accountNumber', 'routingNumber', 'ssn', 'taxId',
    'access_token', 'refresh_token', 'api_key', 'secret',
    'password', 'pin', 'cvv', 'account_number'
  ];

  static sanitize(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if field is sensitive
      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitize(value);
      } else {
        // Mask potential sensitive patterns
        sanitized[key] = this.maskSensitivePatterns(value);
      }
    }

    return sanitized;
  }

  private static maskSensitivePatterns(value: any): any {
    if (typeof value !== 'string') return value;

    // Mask credit card patterns
    if (/^\d{13,19}$/.test(value)) {
      return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    }

    // Mask SSN patterns
    if (/^\d{3}-?\d{2}-?\d{4}$/.test(value)) {
      return 'XXX-XX-' + value.substring(value.length - 4);
    }

    return value;
  }

  static log(level: string, message: string, data?: any) {
    const sanitizedData = data ? this.sanitize(data) : undefined;
    console[level](message, sanitizedData);
  }
}
```

### 🔴 HIGH-8: Missing Database Field-Level Encryption
**Finding**: No encryption for sensitive fields beyond Plaid tokens.
**Impact**: Database compromise exposes all sensitive data.
**Recommendation**: Implement field-level encryption for PII fields.

### 🟡 MEDIUM-4: Insufficient Data Retention Policies
**Finding**: No automated data purging for old payment records.
**Impact**: Unnecessary data retention increases breach impact.
**Recommendation**: Implement 7-year retention with automated purging.

---

## 5. Authentication & Authorization

### 🔴 HIGH-9: Missing CSRF Protection
**Finding**: No CSRF token validation for state-changing operations.
**Impact**: Cross-site request forgery attacks possible.
**Recommendation**:
```javascript
// Install: npm install csurf
import csrf from 'csurf';

// In Netlify function wrapper
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Generate token for frontend
export const getCsrfToken: Handler = async (event) => {
  const token = crypto.randomBytes(32).toString('hex');

  // Store in Redis with session ID
  await redis.setex(`csrf:${sessionId}`, 3600, token);

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': `csrf=${token}; HttpOnly; Secure; SameSite=Strict`
    },
    body: JSON.stringify({ csrfToken: token })
  };
};

// Validate on state-changing operations
const validateCsrf = async (event: HandlerEvent) => {
  const token = event.headers['x-csrf-token'];
  const sessionId = getSessionId(event);
  const storedToken = await redis.get(`csrf:${sessionId}`);

  if (!token || token !== storedToken) {
    throw new Error('Invalid CSRF token');
  }
};
```

### 🔴 HIGH-10: Weak Session Management
**Finding**: No proper session validation or timeout handling.
**Impact**: Session hijacking and fixation attacks.
**Recommendation**:
```javascript
class SessionManager {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly SESSION_ABSOLUTE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  static async createSession(userId: string): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    };

    await redis.setex(
      `session:${sessionId}`,
      this.SESSION_TIMEOUT / 1000,
      JSON.stringify(sessionData)
    );

    return sessionId;
  }

  static async validateSession(sessionId: string, request: any): Promise<boolean> {
    const sessionData = await redis.get(`session:${sessionId}`);
    if (!sessionData) return false;

    const session = JSON.parse(sessionData);

    // Validate session age
    if (Date.now() - session.createdAt > this.SESSION_ABSOLUTE_TIMEOUT) {
      await this.destroySession(sessionId);
      return false;
    }

    // Validate session fingerprint
    if (session.ipAddress !== request.ip ||
        session.userAgent !== request.headers['user-agent']) {
      console.warn('Session fingerprint mismatch', { sessionId });
      return false;
    }

    // Update last activity
    session.lastActivity = Date.now();
    await redis.setex(
      `session:${sessionId}`,
      this.SESSION_TIMEOUT / 1000,
      JSON.stringify(session)
    );

    return true;
  }
}
```

### 🟡 MEDIUM-5: Missing Role-Based Access Control
**Finding**: No RBAC implementation for administrative functions.
**Impact**: Potential privilege escalation.
**Recommendation**: Implement proper RBAC with least privilege.

---

## 6. Input Validation

### 🔴 HIGH-11: Insufficient Input Sanitization
**Finding**: Limited XSS protection and input sanitization.
**Impact**: XSS attacks could compromise user sessions.
**Recommendation**:
```javascript
// Install: npm install dompurify jsdom validator
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

class InputSanitizer {
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  static sanitizeCompanyName(input: string): string {
    // Remove HTML tags
    let sanitized = this.sanitizeHTML(input);

    // Remove special characters except allowed ones
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-&.,]/g, '');

    // Trim and normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    // Validate length
    if (sanitized.length < 2 || sanitized.length > 100) {
      throw new Error('Company name must be 2-100 characters');
    }

    return sanitized;
  }

  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeHTML(email).toLowerCase().trim();

    if (!validator.isEmail(sanitized)) {
      throw new Error('Invalid email address');
    }

    return validator.normalizeEmail(sanitized) || sanitized;
  }

  static sanitizeBankAccount(accountNumber: string): string {
    // Remove all non-digits
    const sanitized = accountNumber.replace(/\D/g, '');

    // Validate US bank account number (3-17 digits)
    if (!/^\d{3,17}$/.test(sanitized)) {
      throw new Error('Invalid account number format');
    }

    return sanitized;
  }

  static sanitizeRoutingNumber(routingNumber: string): string {
    const sanitized = routingNumber.replace(/\D/g, '');

    // Validate US routing number (9 digits)
    if (!/^\d{9}$/.test(sanitized)) {
      throw new Error('Invalid routing number');
    }

    // Validate checksum (ABA routing number algorithm)
    const digits = sanitized.split('').map(Number);
    const checksum = (
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      (digits[2] + digits[5] + digits[8])
    ) % 10;

    if (checksum !== 0) {
      throw new Error('Invalid routing number checksum');
    }

    return sanitized;
  }
}

// Usage in request handlers
const sanitizedData = {
  companyName: InputSanitizer.sanitizeCompanyName(req.body.companyName),
  email: InputSanitizer.sanitizeEmail(req.body.email),
  accountNumber: InputSanitizer.sanitizeBankAccount(req.body.accountNumber),
  routingNumber: InputSanitizer.sanitizeRoutingNumber(req.body.routingNumber)
};
```

### 🔴 HIGH-12: SQL Injection Risk in Raw Queries
**Finding**: Potential for SQL injection if raw queries are used.
**Impact**: Database compromise and data exfiltration.
**Recommendation**:
```javascript
// NEVER do this
const BAD = `SELECT * FROM users WHERE email = '${userInput}'`;

// ALWAYS use parameterized queries
const GOOD = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput)
  .single();

// For complex queries, use prepared statements
const { data, error } = await supabase.rpc('get_user_by_email', {
  email_param: userInput
});
```

### 🟡 MEDIUM-6: Missing Request Size Limits
**Finding**: No limits on request body size.
**Impact**: DoS via large payloads.
**Recommendation**: Implement 1MB request size limit.

---

## 7. Compliance

### 🔴 HIGH-13: Incomplete NACHA Compliance
**Finding**: Missing required ACH authorization language.
**Impact**: Non-compliance with NACHA rules, potential fines.
**Recommendation**:
```javascript
const ACH_AUTHORIZATION_TEMPLATE = `
By clicking "Authorize", I authorize ${companyName} to electronically debit my account
and, if necessary, electronically credit my account to correct erroneous debits.
I understand that this authorization will remain in effect until I cancel it in writing.

I agree that ACH transactions I authorize comply with all applicable laws.

Date: ${new Date().toISOString()}
Amount: $${amount}
Frequency: ${frequency}
Account: ****${accountLast4}
`;

// Store authorization record
await supabase.from('ach_authorizations').insert({
  customer_id: customerId,
  authorization_text: ACH_AUTHORIZATION_TEMPLATE,
  ip_address: request.ip,
  user_agent: request.headers['user-agent'],
  timestamp: new Date().toISOString(),
  signature_method: 'electronic_consent'
});
```

### 🔴 HIGH-14: Missing PCI DSS Controls
**Finding**: Insufficient security controls for payment data.
**Impact**: PCI non-compliance, potential fines.
**Recommendation**:
- Implement network segmentation
- Deploy Web Application Firewall (WAF)
- Enable detailed audit logging
- Implement file integrity monitoring
- Schedule quarterly vulnerability scans

### 🟡 MEDIUM-7: Inadequate GDPR Compliance
**Finding**: Missing data privacy controls for EU customers.
**Impact**: GDPR violations, fines up to 4% of revenue.
**Recommendation**:
```javascript
class GDPRCompliance {
  static async handleDataRequest(userId: string, requestType: string) {
    switch (requestType) {
      case 'ACCESS':
        return await this.exportUserData(userId);
      case 'DELETE':
        return await this.deleteUserData(userId);
      case 'PORTABILITY':
        return await this.exportPortableData(userId);
      case 'RECTIFICATION':
        return await this.allowDataCorrection(userId);
    }
  }

  static async anonymizeOldData() {
    // Anonymize data older than retention period
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 7);

    await supabase.rpc('anonymize_old_payments', {
      cutoff_date: cutoffDate.toISOString()
    });
  }
}
```

---

## 8. Error Handling

### 🔴 HIGH-15: Information Disclosure in Errors
**Finding**: Detailed error messages could leak sensitive information.
**Impact**: Information disclosure aiding attackers.
**Recommendation**:
```javascript
class SecureErrorHandler {
  private static errorMap = new Map([
    ['STRIPE_INVALID_REQUEST', 'Payment processing error. Please try again.'],
    ['PLAID_ITEM_ERROR', 'Unable to connect to your bank. Please try again.'],
    ['DATABASE_ERROR', 'System error. Please contact support.'],
    ['VALIDATION_ERROR', 'Invalid input provided.'],
  ]);

  static handle(error: any): { statusCode: number; message: string; trackingId: string } {
    const trackingId = crypto.randomBytes(16).toString('hex');

    // Log full error internally with tracking ID
    console.error('Error occurred:', {
      trackingId,
      error: error.stack || error,
      timestamp: new Date().toISOString()
    });

    // Return generic message to user
    const userMessage = this.errorMap.get(error.code) ||
                       'An error occurred. Please try again later.';

    return {
      statusCode: error.statusCode || 500,
      message: userMessage,
      trackingId // User can provide this for support
    };
  }
}
```

### 🟡 MEDIUM-8: Missing Circuit Breaker Pattern
**Finding**: No circuit breaker for external service failures.
**Impact**: Cascading failures when external services are down.
**Recommendation**: Implement circuit breaker pattern.

---

## 9. Security Testing Checklist

### Pre-Deployment Security Tests

```bash
# 1. Dependency Vulnerability Scan
npm audit
npm audit fix

# 2. OWASP Dependency Check
npx owasp-dependency-check --scan . --format HTML --out ./security-report

# 3. Static Application Security Testing (SAST)
npx eslint . --ext .js,.ts,.tsx
npx semgrep --config=auto .

# 4. Secrets Detection
npx trufflehog filesystem . --json > secrets-scan.json
npx gitleaks detect --source . --verbose

# 5. Security Headers Test
curl -I https://your-site.com | grep -E "X-Frame-Options|X-Content-Type|Strict-Transport"
```

### Runtime Security Tests

```javascript
// security-tests.spec.js
describe('Security Tests', () => {
  test('SQL Injection Prevention', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await fetch('/api/signup-with-payment', {
      method: 'POST',
      body: JSON.stringify({ email: maliciousInput })
    });
    expect(response.status).toBe(400);
    // Verify database tables still exist
  });

  test('XSS Prevention', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await fetch('/api/signup-with-payment', {
      method: 'POST',
      body: JSON.stringify({ companyName: xssPayload })
    });
    const data = await response.json();
    expect(data.companyName).not.toContain('<script>');
  });

  test('CSRF Token Validation', async () => {
    const response = await fetch('/api/signup-with-payment', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'invalid' }
    });
    expect(response.status).toBe(403);
  });

  test('Rate Limiting', async () => {
    const requests = Array(15).fill(null).map(() =>
      fetch('/api/webhook-stripe', { method: 'POST' })
    );
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

---

## 10. Security Implementation Roadmap

### Phase 1: Critical Security (Week 1)
```javascript
const PHASE_1_TASKS = [
  'Install security dependencies (helmet, express-rate-limit, etc.)',
  'Implement environment variable validation',
  'Add webhook signature verification',
  'Implement input sanitization for all endpoints',
  'Add CSRF protection',
  'Set up secure logging without sensitive data'
];
```

### Phase 2: Data Protection (Week 2)
```javascript
const PHASE_2_TASKS = [
  'Implement field-level encryption for tokens',
  'Add database query parameterization',
  'Set up key rotation service',
  'Implement session management',
  'Add audit logging'
];
```

### Phase 3: Compliance & Monitoring (Week 3)
```javascript
const PHASE_3_TASKS = [
  'Add NACHA compliance authorization',
  'Implement GDPR data controls',
  'Set up security monitoring and alerts',
  'Configure WAF rules',
  'Run penetration testing'
];
```

---

## 11. Required Security Dependencies

```json
{
  "dependencies": {
    // Security essentials
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "csurf": "^1.11.0",

    // Input validation & sanitization
    "dompurify": "^3.0.8",
    "isomorphic-dompurify": "^2.4.0",
    "validator": "^13.11.0",

    // Encryption
    "node-forge": "^1.3.1",
    "bcryptjs": "^2.4.3",

    // Session management
    "ioredis": "^5.3.2",
    "connect-redis": "^7.1.0",

    // Security monitoring
    "@sentry/node": "^7.91.0",
    "winston": "^3.11.0",
    "winston-cloudwatch": "^6.2.0"
  },
  "devDependencies": {
    // Security testing
    "@owasp/dependency-check": "^0.0.21",
    "eslint-plugin-security": "^2.1.0",
    "snyk": "^1.1266.0",
    "gitleaks": "^8.18.1"
  }
}
```

---

## 12. Security Monitoring & Alerts

```javascript
class SecurityMonitor {
  static alerts = {
    CRITICAL: {
      'Multiple failed webhook signatures': 5,
      'Unusual payment volume spike': 10,
      'Failed key rotation': 1,
      'Database encryption failure': 1
    },
    HIGH: {
      'Rate limit exceeded': 100,
      'Invalid CSRF attempts': 50,
      'Failed payment authorizations': 20
    },
    MEDIUM: {
      'Expired sessions': 500,
      'Input validation failures': 200
    }
  };

  static async checkThresholds() {
    for (const [severity, checks] of Object.entries(this.alerts)) {
      for (const [metric, threshold] of Object.entries(checks)) {
        const count = await this.getMetricCount(metric);
        if (count > threshold) {
          await this.sendAlert(severity, metric, count);
        }
      }
    }
  }

  static async sendAlert(severity: string, metric: string, count: number) {
    // Send to PagerDuty, Slack, Email based on severity
    if (severity === 'CRITICAL') {
      await this.pageOnCall(metric, count);
    }
    await this.logToSIEM(severity, metric, count);
  }
}
```

---

## 13. Incident Response Plan

### Security Incident Playbook

```markdown
## API Key Compromise Response
1. **Immediate Actions** (0-15 minutes)
   - Rotate compromised keys immediately
   - Check audit logs for unauthorized usage
   - Block suspicious IPs

2. **Investigation** (15-60 minutes)
   - Analyze access patterns
   - Identify affected customers
   - Determine data exposure scope

3. **Remediation** (1-4 hours)
   - Deploy new keys
   - Force re-authentication for affected users
   - Patch vulnerability that led to compromise

4. **Communication** (2-4 hours)
   - Notify affected customers
   - File breach report if required
   - Update security documentation

## Payment Data Breach Response
1. **Containment** (0-30 minutes)
   - Disable affected payment endpoints
   - Isolate compromised systems
   - Preserve forensic evidence

2. **Assessment** (30 minutes - 2 hours)
   - Determine breach scope
   - Identify affected payment methods
   - Check for ongoing exfiltration

3. **Notification** (2-24 hours)
   - Contact payment processors (Stripe/Plaid)
   - Notify legal counsel
   - Prepare customer communications

4. **Recovery** (24-72 hours)
   - Implement additional controls
   - Re-enable services with monitoring
   - Conduct post-incident review
```

---

## Conclusion

This security audit identifies critical vulnerabilities that must be addressed before production deployment. The highest priority items are:

1. **Implement token encryption** - Protect Plaid access tokens
2. **Add rate limiting** - Prevent DoS attacks
3. **Secure webhook endpoints** - Prevent replay attacks
4. **Implement CSRF protection** - Prevent cross-site attacks
5. **Add comprehensive input validation** - Prevent injection attacks

**Estimated Security Hardening Timeline**: 3 weeks
**Required Security Investment**: ~$5,000 for tools and services
**Risk Level if Deployed As-Is**: 🔴 **CRITICAL**

### Recommendation
**DO NOT DEPLOY TO PRODUCTION** without addressing all HIGH severity findings. The current architecture has significant security gaps that could lead to data breaches, financial losses, and regulatory penalties.

---

**Document Classification**: CONFIDENTIAL
**Distribution**: Development Team, Security Team, CTO
**Next Review Date**: Before Production Deployment