/**
 * PLAID TYPE DEFINITIONS
 *
 * TypeScript interfaces for Plaid Link integration and instant bank verification.
 * Used across frontend and backend for type-safe bank account operations.
 *
 * Security Notes:
 * - NEVER expose Plaid secret or access tokens to frontend
 * - Always encrypt access tokens before storing in database
 * - Public tokens expire after 30 minutes - exchange immediately
 * - Link tokens expire after 4 hours - generate fresh for each session
 *
 * @see STRIPE-PLAID-ARCHITECTURE.md
 * @see SECURITY-AUDIT-STRIPE-PLAID.md
 */

import type {
  PlaidError as PlaidApiError,
  Account,
  Institution,
  ItemPublicTokenExchangeResponse,
  ProcessorStripeBankAccountTokenCreateResponse,
} from 'plaid';

// ==============================================================================
// ENUMS & CONSTANTS
// ==============================================================================

/**
 * Plaid environment configuration
 */
export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

/**
 * Plaid product types
 */
export type PlaidProduct =
  | 'auth'           // Bank account authentication (required for ACH)
  | 'transactions'   // Transaction history
  | 'identity'       // Account holder identity
  | 'assets'         // Asset reports
  | 'investments'    // Investment account data
  | 'liabilities'    // Liability data
  | 'payment_initiation'; // Payment initiation (UK/EU only)

/**
 * Plaid Link flow types
 */
export type PlaidLinkFlow = 'signup' | 'update' | 'reauth';

/**
 * Account types in Plaid
 */
export type PlaidAccountType =
  | 'depository'     // Checking/Savings accounts
  | 'credit'         // Credit cards
  | 'loan'           // Loans
  | 'investment'     // Investment accounts
  | 'other';         // Other account types

/**
 * Account subtypes for depository accounts
 */
export type PlaidDepositorySubtype =
  | 'checking'
  | 'savings'
  | 'hsa'            // Health Savings Account
  | 'cd'             // Certificate of Deposit
  | 'money market'
  | 'paypal'
  | 'prepaid';

/**
 * Verification status for accounts
 */
export type PlaidVerificationStatus =
  | 'automatically_verified'
  | 'pending_automatic_verification'
  | 'pending_manual_verification'
  | 'manually_verified'
  | 'verification_expired'
  | 'verification_failed';

/**
 * Item status
 */
export type PlaidItemStatus = 'good' | 'bad' | 'requires_user_action';

// ==============================================================================
// LINK TOKEN TYPES
// ==============================================================================

/**
 * Parameters for creating a Plaid Link token
 *
 * @example
 * ```typescript
 * const params: CreatePlaidLinkTokenParams = {
 *   userId: 'uuid-here',
 *   companyName: 'Green Lawn Landscaping',
 *   redirectUri: 'https://tradesphere.com/oauth-return',
 *   language: 'en',
 *   countryCodes: ['US']
 * };
 * ```
 */
export interface CreatePlaidLinkTokenParams {
  /** Unique user identifier (use temp ID for signup flow) */
  userId: string;

  /** Company name for display in Plaid Link */
  companyName: string;

  /** Redirect URI for OAuth flow (optional) */
  redirectUri?: string;

  /** Language code (default: 'en') */
  language?: string;

  /** Country codes (default: ['US']) */
  countryCodes?: string[];

  /** Products to enable (default: ['auth']) */
  products?: PlaidProduct[];

  /** Webhook URL for events (optional) */
  webhook?: string;

  /** Account filters (e.g., only checking/savings) */
  accountFilters?: PlaidAccountFilters;
}

/**
 * Account filters for Plaid Link
 */
export interface PlaidAccountFilters {
  depository?: {
    account_subtypes: PlaidDepositorySubtype[];
  };
  credit?: {
    account_subtypes: string[];
  };
}

/**
 * Plaid Link token response
 */
export interface PlaidLinkTokenResponse {
  /** Link token for frontend */
  linkToken: string;

  /** Expiration timestamp (4 hours from creation) */
  expiration: string;

  /** Request ID for debugging */
  requestId?: string;
}

// ==============================================================================
// PLAID LINK FRONTEND TYPES
// ==============================================================================

/**
 * Plaid Link configuration for frontend
 *
 * @example
 * ```typescript
 * const config: PlaidLinkConfig = {
 *   token: 'link-sandbox-xxx',
 *   onSuccess: (publicToken, metadata) => {
 *     console.log('Bank connected:', metadata.institution);
 *   },
 *   onExit: (error, metadata) => {
 *     if (error) console.error('Link error:', error);
 *   }
 * };
 * ```
 */
export interface PlaidLinkConfig {
  /** Link token from backend */
  token: string;

  /** Success callback - receives public token */
  onSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => void;

  /** Exit callback - user closed Link */
  onExit?: (error: PlaidLinkError | null, metadata: PlaidLinkExitMetadata) => void;

  /** Event callback - track user interactions */
  onEvent?: (eventName: string, metadata: PlaidLinkEventMetadata) => void;

  /** Load callback - Link loaded */
  onLoad?: () => void;

  /** Redirect URI (for OAuth) */
  receivedRedirectUri?: string;
}

/**
 * Metadata returned on successful Link connection
 */
export interface PlaidLinkSuccessMetadata {
  /** Institution information */
  institution: {
    /** Institution ID */
    institution_id: string;

    /** Institution name */
    name: string;
  };

  /** Connected accounts */
  accounts: Array<{
    /** Account ID */
    id: string;

    /** Account name */
    name: string;

    /** Account mask (last 4 digits) */
    mask: string;

    /** Account type */
    type: PlaidAccountType;

    /** Account subtype */
    subtype: string;

    /** Verification status */
    verification_status?: PlaidVerificationStatus;
  }>;

  /** Link session ID */
  link_session_id: string;

  /** Transfer status (if applicable) */
  transfer_status?: string;
}

/**
 * Plaid Link error object
 */
export interface PlaidLinkError {
  /** Error code */
  error_code: string;

  /** Error message */
  error_message: string;

  /** Error type */
  error_type: PlaidErrorType;

  /** Display message for user */
  display_message: string | null;
}

/**
 * Metadata returned when user exits Link
 */
export interface PlaidLinkExitMetadata {
  /** Institution (if selected) */
  institution?: {
    institution_id: string;
    name: string;
  };

  /** Link session ID */
  link_session_id: string;

  /** Request ID */
  request_id: string;

  /** Exit status */
  status: string;
}

/**
 * Metadata for Link events
 */
export interface PlaidLinkEventMetadata {
  /** Event name */
  event_name: string;

  /** Link session ID */
  link_session_id: string;

  /** Timestamp */
  timestamp: string;

  /** Additional metadata */
  [key: string]: unknown;
}

// ==============================================================================
// PUBLIC TOKEN EXCHANGE TYPES
// ==============================================================================

/**
 * Parameters for exchanging public token
 *
 * @example
 * ```typescript
 * const params: ExchangePublicTokenParams = {
 *   publicToken: 'public-sandbox-xxx',
 *   accountId: 'account-id-xxx'
 * };
 * ```
 */
export interface ExchangePublicTokenParams {
  /** Public token from Plaid Link (expires in 30 minutes) */
  publicToken: string;

  /** Selected account ID */
  accountId: string;
}

/**
 * Response from public token exchange
 */
export interface ExchangePublicTokenResponse {
  /** Permanent access token (MUST be encrypted before storage) */
  accessToken: string;

  /** Item ID */
  itemId: string;

  /** Request ID for debugging */
  requestId?: string;
}

// ==============================================================================
// PROCESSOR TOKEN TYPES (STRIPE)
// ==============================================================================

/**
 * Parameters for creating Stripe processor token
 *
 * @example
 * ```typescript
 * const params: CreateProcessorTokenParams = {
 *   accessToken: 'access-sandbox-xxx',
 *   accountId: 'account-id-xxx'
 * };
 * ```
 */
export interface CreateProcessorTokenParams {
  /** Plaid access token */
  accessToken: string;

  /** Account ID to create token for */
  accountId: string;
}

/**
 * Response from processor token creation
 */
export interface CreateProcessorTokenResponse {
  /** Stripe bank account token (btok_xxx) */
  processorToken: string;

  /** Request ID for debugging */
  requestId?: string;
}

// ==============================================================================
// ACCOUNT TYPES
// ==============================================================================

/**
 * Plaid account balance
 */
export interface PlaidBalance {
  /** Available balance */
  available: number | null;

  /** Current balance */
  current: number | null;

  /** Credit limit (for credit accounts) */
  limit: number | null;

  /** ISO currency code */
  iso_currency_code: string | null;

  /** Unofficial currency code */
  unofficial_currency_code: string | null;
}

/**
 * Plaid account details (simplified from Plaid Account type)
 */
export interface PlaidAccountDetails {
  /** Account ID */
  account_id: string;

  /** Account name */
  name: string;

  /** Official account name */
  official_name: string | null;

  /** Account type */
  type: PlaidAccountType;

  /** Account subtype */
  subtype: string;

  /** Account mask (last 4 digits) */
  mask: string;

  /** Account balance */
  balances: PlaidBalance;

  /** Verification status */
  verification_status?: PlaidVerificationStatus;
}

/**
 * Response from getting account details
 */
export interface GetAccountDetailsResponse {
  /** List of accounts */
  accounts: PlaidAccountDetails[];

  /** Item information */
  item: PlaidItem;

  /** Request ID for debugging */
  requestId?: string;
}

// ==============================================================================
// ITEM TYPES
// ==============================================================================

/**
 * Plaid Item (represents connection to institution)
 */
export interface PlaidItem {
  /** Item ID */
  item_id: string;

  /** Institution ID */
  institution_id: string;

  /** Webhook URL */
  webhook?: string;

  /** Error (if item is in bad state) */
  error?: PlaidApiError;

  /** Available products */
  available_products: PlaidProduct[];

  /** Billed products */
  billed_products: PlaidProduct[];

  /** Update type (background or user_present_required) */
  update_type?: string;
}

/**
 * Parameters for removing an item
 */
export interface RemoveItemParams {
  /** Access token for the item */
  accessToken: string;
}

/**
 * Response from removing an item
 */
export interface RemoveItemResponse {
  /** Whether removal was successful */
  removed: boolean;

  /** Request ID for debugging */
  requestId?: string;
}

// ==============================================================================
// INSTITUTION TYPES
// ==============================================================================

/**
 * Plaid institution information
 */
export interface PlaidInstitution {
  /** Institution ID */
  institution_id: string;

  /** Institution name */
  name: string;

  /** Products supported */
  products: PlaidProduct[];

  /** Country codes */
  country_codes: string[];

  /** Primary color (hex) */
  primary_color?: string;

  /** Logo URL */
  logo?: string;

  /** URL */
  url?: string;

  /** OAuth support */
  oauth?: boolean;

  /** Status */
  status?: {
    item_logins: {
      status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
      last_status_change: string;
    };
  };
}

// ==============================================================================
// ERROR TYPES
// ==============================================================================

/**
 * Plaid error types
 */
export type PlaidErrorType =
  | 'INVALID_REQUEST'
  | 'INVALID_INPUT'
  | 'INVALID_RESULT'
  | 'API_ERROR'
  | 'ITEM_ERROR'
  | 'ASSET_REPORT_ERROR'
  | 'RECAPTCHA_ERROR'
  | 'OAUTH_ERROR'
  | 'PAYMENT_ERROR'
  | 'BANK_TRANSFER_ERROR'
  | 'INCOME_VERIFICATION_ERROR'
  | 'MICRODEPOSIT_ERROR';

/**
 * Common Plaid error codes
 */
export type PlaidErrorCode =
  // Item errors
  | 'ITEM_LOGIN_REQUIRED'
  | 'ITEM_NOT_FOUND'
  | 'ITEM_NO_LONGER_AVAILABLE'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_MFA'
  | 'INVALID_SEND_METHOD'
  | 'INVALID_UPDATED_USERNAME'
  | 'ITEM_LOCKED'
  | 'USER_SETUP_REQUIRED'
  | 'MFA_NOT_SUPPORTED'
  | 'NO_ACCOUNTS'
  | 'PRODUCT_NOT_READY'
  | 'INSUFFICIENT_CREDENTIALS'

  // API errors
  | 'INTERNAL_SERVER_ERROR'
  | 'PLANNED_MAINTENANCE'

  // Request errors
  | 'INVALID_API_KEYS'
  | 'INVALID_ACCESS_TOKEN'
  | 'INVALID_PUBLIC_TOKEN'
  | 'INVALID_PRODUCT'
  | 'INVALID_ACCOUNT_ID'
  | 'MISSING_FIELDS'
  | 'UNKNOWN_FIELDS'
  | 'INVALID_FIELD'

  // Rate limiting
  | 'RATE_LIMIT_EXCEEDED';

/**
 * Plaid error object (extended from API)
 */
export interface PlaidError extends PlaidApiError {
  /** Error type */
  error_type: PlaidErrorType;

  /** Error code */
  error_code: PlaidErrorCode;

  /** Error message */
  error_message: string;

  /** Display message for end user */
  display_message?: string | null;

  /** Request ID */
  request_id?: string;

  /** HTTP status code */
  status?: number;

  /** Additional causes */
  causes?: Array<{
    item_id: string;
    error_type: PlaidErrorType;
    error_code: PlaidErrorCode;
    error_message: string;
  }>;
}

/**
 * Service error response for Plaid operations
 */
export interface PlaidServiceError {
  /** Error code for programmatic handling */
  code: string;

  /** Detailed error message (for logging) */
  message: string;

  /** User-friendly error message (safe to display) */
  userMessage: string;

  /** Original Plaid error (if applicable) */
  plaidError?: PlaidError;

  /** Whether error is retryable */
  retryable?: boolean;
}

/**
 * Service response wrapper for Plaid operations
 *
 * @example
 * ```typescript
 * const result: PlaidServiceResponse<PlaidLinkTokenResponse> =
 *   await plaidService.createLinkToken(params);
 *
 * if (result.success) {
 *   console.log(result.data.linkToken);
 * } else {
 *   console.error(result.error?.userMessage);
 * }
 * ```
 */
export interface PlaidServiceResponse<T = unknown> {
  /** Whether operation succeeded */
  success: boolean;

  /** Response data (if successful) */
  data?: T;

  /** Error information (if failed) */
  error?: PlaidServiceError;
}

// ==============================================================================
// WEBHOOK TYPES
// ==============================================================================

/**
 * Plaid webhook event types
 */
export type PlaidWebhookType =
  | 'TRANSACTIONS'
  | 'ITEM'
  | 'AUTH'
  | 'ASSETS'
  | 'HOLDINGS'
  | 'INVESTMENTS_TRANSACTIONS'
  | 'LIABILITIES'
  | 'INCOME'
  | 'IDENTITY_VERIFICATION';

/**
 * Plaid webhook codes
 */
export type PlaidWebhookCode =
  // Item webhooks
  | 'ERROR'
  | 'PENDING_EXPIRATION'
  | 'USER_PERMISSION_REVOKED'
  | 'WEBHOOK_UPDATE_ACKNOWLEDGED'
  | 'NEW_ACCOUNTS_AVAILABLE'

  // Auth webhooks
  | 'AUTOMATICALLY_VERIFIED'
  | 'VERIFICATION_EXPIRED'

  // Transaction webhooks
  | 'INITIAL_UPDATE'
  | 'HISTORICAL_UPDATE'
  | 'DEFAULT_UPDATE'
  | 'TRANSACTIONS_REMOVED';

/**
 * Base Plaid webhook payload
 */
export interface PlaidWebhookPayload {
  /** Webhook type */
  webhook_type: PlaidWebhookType;

  /** Webhook code */
  webhook_code: PlaidWebhookCode;

  /** Item ID */
  item_id: string;

  /** Error (if applicable) */
  error?: PlaidError;
}

/**
 * Item webhook payload
 */
export interface PlaidItemWebhook extends PlaidWebhookPayload {
  webhook_type: 'ITEM';
  webhook_code: 'ERROR' | 'PENDING_EXPIRATION' | 'USER_PERMISSION_REVOKED' | 'NEW_ACCOUNTS_AVAILABLE';
}

/**
 * Auth webhook payload
 */
export interface PlaidAuthWebhook extends PlaidWebhookPayload {
  webhook_type: 'AUTH';
  webhook_code: 'AUTOMATICALLY_VERIFIED' | 'VERIFICATION_EXPIRED';
  account_id: string;
}

/**
 * Webhook verification result
 */
export interface PlaidWebhookVerificationResult {
  /** Whether webhook signature is valid */
  valid: boolean;

  /** Webhook payload (if valid) */
  payload?: PlaidWebhookPayload;

  /** Error message (if invalid) */
  error?: string;
}

// ==============================================================================
// DATABASE STORAGE TYPES
// ==============================================================================

/**
 * Plaid item record for database storage
 *
 * SECURITY: access_token MUST be encrypted before storage
 */
export interface PlaidItemRecord {
  /** Record ID */
  id: string;

  /** Company ID */
  company_id: string;

  /** Item ID */
  item_id: string;

  /** ENCRYPTED access token (NEVER store in plain text) */
  encrypted_access_token: string;

  /** Institution ID */
  institution_id: string;

  /** Institution name (for display) */
  institution_name: string;

  /** Account ID */
  account_id: string;

  /** Account name (for display) */
  account_name: string;

  /** Account mask (last 4 digits) */
  account_mask: string;

  /** Account type */
  account_type: PlaidAccountType;

  /** Account subtype */
  account_subtype: string;

  /** Verification status */
  verification_status?: PlaidVerificationStatus;

  /** Whether item is active */
  is_active: boolean;

  /** Last error (if any) */
  last_error?: string;

  /** Timestamp when created */
  created_at: string;

  /** Timestamp when last updated */
  updated_at: string;
}

// ==============================================================================
// TYPE GUARDS
// ==============================================================================

/**
 * Type guard to check if account is depository (checking/savings)
 *
 * @example
 * ```typescript
 * if (isDepositoryAccount(account)) {
 *   // Account is checking or savings
 * }
 * ```
 */
export function isDepositoryAccount(
  account: PlaidAccountDetails
): account is PlaidAccountDetails & { type: 'depository' } {
  return account.type === 'depository';
}

/**
 * Type guard to check if account is verified
 */
export function isVerifiedAccount(account: PlaidAccountDetails): boolean {
  return (
    account.verification_status === 'automatically_verified' ||
    account.verification_status === 'manually_verified'
  );
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryablePlaidError(error: PlaidError): boolean {
  const retryableCodes: PlaidErrorCode[] = [
    'INTERNAL_SERVER_ERROR',
    'PLANNED_MAINTENANCE',
    'RATE_LIMIT_EXCEEDED',
  ];

  return retryableCodes.includes(error.error_code);
}

/**
 * Type guard to check if error requires user action
 */
export function requiresUserAction(error: PlaidError): boolean {
  const userActionCodes: PlaidErrorCode[] = [
    'ITEM_LOGIN_REQUIRED',
    'INVALID_CREDENTIALS',
    'INVALID_MFA',
    'USER_SETUP_REQUIRED',
    'ITEM_LOCKED',
  ];

  return userActionCodes.includes(error.error_code);
}

// ==============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ==============================================================================

/**
 * Map of Plaid error codes to user-friendly messages
 */
export const PlaidErrorMessages: Record<PlaidErrorCode, string> = {
  // Item errors
  ITEM_LOGIN_REQUIRED: 'Please log in to your bank account again to continue.',
  ITEM_NOT_FOUND: 'Bank connection not found. Please reconnect your bank account.',
  ITEM_NO_LONGER_AVAILABLE: 'This bank account is no longer available. Please add a new account.',
  INVALID_CREDENTIALS: 'Invalid bank credentials. Please check and try again.',
  INVALID_MFA: 'Invalid verification code. Please try again.',
  INVALID_SEND_METHOD: 'Invalid verification method selected.',
  INVALID_UPDATED_USERNAME: 'Invalid username. Please check and try again.',
  ITEM_LOCKED: 'Your bank account is locked. Please contact your bank.',
  USER_SETUP_REQUIRED: 'Additional setup required. Please complete setup with your bank.',
  MFA_NOT_SUPPORTED: 'This verification method is not supported. Please try another method.',
  NO_ACCOUNTS: 'No eligible accounts found. Please ensure you have a checking or savings account.',
  PRODUCT_NOT_READY: 'Bank verification is still processing. Please wait a moment.',
  INSUFFICIENT_CREDENTIALS: 'Additional authentication required. Please complete verification.',

  // API errors
  INTERNAL_SERVER_ERROR: 'Bank verification service temporarily unavailable. Please try again.',
  PLANNED_MAINTENANCE: 'Bank verification service is undergoing maintenance. Please try again later.',

  // Request errors
  INVALID_API_KEYS: 'Configuration error. Please contact support.',
  INVALID_ACCESS_TOKEN: 'Session expired. Please reconnect your bank account.',
  INVALID_PUBLIC_TOKEN: 'Verification token expired. Please restart the process.',
  INVALID_PRODUCT: 'Configuration error. Please contact support.',
  INVALID_ACCOUNT_ID: 'Invalid account selected. Please try again.',
  MISSING_FIELDS: 'Required information missing. Please complete all fields.',
  UNKNOWN_FIELDS: 'Invalid data provided. Please check and try again.',
  INVALID_FIELD: 'Invalid information provided. Please check and try again.',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please wait a moment and try again.',
};

/**
 * Get user-friendly error message for Plaid error
 *
 * @example
 * ```typescript
 * const message = getUserFriendlyErrorMessage(plaidError);
 * // Returns: "Please log in to your bank account again to continue."
 * ```
 */
export function getUserFriendlyErrorMessage(error: PlaidError): string {
  return (
    error.display_message ||
    PlaidErrorMessages[error.error_code] ||
    'Unable to verify bank account. Please try again.'
  );
}

// ==============================================================================
// VALIDATION HELPERS
// ==============================================================================

/**
 * Validate that a public token is properly formatted
 *
 * @throws Error if token is invalid
 */
export function validatePublicToken(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid public token format');
  }

  // Public tokens start with "public-" in all environments
  if (!token.startsWith('public-')) {
    throw new Error('Invalid public token format');
  }

  // Tokens should be at least 20 characters
  if (token.length < 20) {
    throw new Error('Invalid public token format');
  }
}

/**
 * Validate that an access token is properly formatted
 *
 * @throws Error if token is invalid
 */
export function validateAccessToken(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid access token format');
  }

  // Access tokens start with "access-" in all environments
  if (!token.startsWith('access-')) {
    throw new Error('Invalid access token format');
  }

  // Tokens should be at least 20 characters
  if (token.length < 20) {
    throw new Error('Invalid access token format');
  }
}

/**
 * Validate account ID format
 *
 * @throws Error if account ID is invalid
 */
export function validateAccountId(accountId: string): void {
  if (!accountId || typeof accountId !== 'string') {
    throw new Error('Invalid account ID');
  }

  // Account IDs should be non-empty strings
  if (accountId.trim().length === 0) {
    throw new Error('Invalid account ID');
  }
}

/**
 * Check if Link token is expired
 *
 * @example
 * ```typescript
 * if (isLinkTokenExpired(tokenResponse.expiration)) {
 *   // Generate new token
 * }
 * ```
 */
export function isLinkTokenExpired(expiration: string): boolean {
  const expirationTime = new Date(expiration).getTime();
  const now = Date.now();
  return now >= expirationTime;
}

/**
 * Get remaining time until Link token expiration
 *
 * @returns Milliseconds until expiration, or 0 if expired
 */
export function getTokenTimeRemaining(expiration: string): number {
  const expirationTime = new Date(expiration).getTime();
  const now = Date.now();
  return Math.max(0, expirationTime - now);
}

/**
 * Format account mask for display
 *
 * @example
 * ```typescript
 * const formatted = formatAccountMask('1234'); // "****1234"
 * ```
 */
export function formatAccountMask(mask: string): string {
  return `****${mask}`;
}

/**
 * Get account display name
 *
 * @example
 * ```typescript
 * const display = getAccountDisplayName(account);
 * // Returns: "Chase Checking ****1234"
 * ```
 */
export function getAccountDisplayName(
  account: PlaidAccountDetails,
  institutionName?: string
): string {
  const parts: string[] = [];

  if (institutionName) {
    parts.push(institutionName);
  }

  parts.push(account.name);

  if (account.mask) {
    parts.push(formatAccountMask(account.mask));
  }

  return parts.join(' ');
}
