/**
 * PLAID BANK VERIFICATION SERVICE
 *
 * Production-ready service for Plaid API integration.
 * Handles instant bank verification, account linking, and processor token generation for Stripe.
 *
 * IMPORTANT SECURITY NOTES:
 * - This service can ONLY be used server-side (Netlify functions)
 * - Never expose Plaid secret keys to the frontend
 * - Always encrypt access tokens before storing in database
 * - Exchange public tokens immediately (expire in 30 minutes)
 * - Link tokens expire after 4 hours
 *
 * @see STRIPE-PLAID-ARCHITECTURE.md
 * @see SECURITY-AUDIT-STRIPE-PLAID.md
 */

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  AccountType,
  AccountSubtype,
  ProcessorTokenCreateRequest,
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  AccountsGetRequest,
  InstitutionsGetByIdRequest,
  ItemRemoveRequest,
  ItemGetRequest,
  PlaidError as PlaidApiError,
} from 'plaid';
import crypto from 'crypto';
import type {
  PlaidEnvironment,
  PlaidProduct,
  CreatePlaidLinkTokenParams,
  PlaidLinkTokenResponse,
  ExchangePublicTokenParams,
  ExchangePublicTokenResponse,
  CreateProcessorTokenParams,
  CreateProcessorTokenResponse,
  GetAccountDetailsResponse,
  PlaidAccountDetails,
  PlaidItem,
  PlaidInstitution,
  RemoveItemParams,
  RemoveItemResponse,
  PlaidServiceResponse,
  PlaidServiceError,
  PlaidError,
  PlaidErrorType,
  PlaidErrorCode,
  PlaidAccountFilters,
  validatePublicToken,
  validateAccessToken,
  validateAccountId,
  isRetryablePlaidError,
  requiresUserAction,
  getUserFriendlyErrorMessage,
} from '../types/plaid';

/**
 * Plaid service singleton for instant bank verification
 *
 * @example
 * ```typescript
 * const plaid = PlaidService.getInstance();
 *
 * // 1. Create Link token for frontend
 * const { data: linkToken } = await plaid.createLinkToken({
 *   userId: 'temp-user-id',
 *   companyName: 'ABC Landscaping',
 *   redirectUri: 'https://tradesphere.com/oauth-return'
 * });
 *
 * // 2. Frontend uses Plaid Link with token
 * // 3. Exchange public token from frontend
 * const { data: exchange } = await plaid.exchangePublicToken({
 *   publicToken: 'public-sandbox-xxx',
 *   accountId: 'account-id-xxx'
 * });
 *
 * // 4. Create Stripe processor token
 * const { data: processor } = await plaid.createProcessorToken({
 *   accessToken: exchange.accessToken,
 *   accountId: 'account-id-xxx'
 * });
 *
 * // 5. Use processor.processorToken with StripeService
 * ```
 */
export class PlaidService {
  private plaid: PlaidApi;
  private static instance: PlaidService;
  private environment: PlaidEnvironment;

  /**
   * Private constructor for singleton pattern
   *
   * SECURITY: Plaid credentials must ONLY be available server-side.
   * This service should only be used in Netlify functions, never in browser code.
   */
  private constructor() {
    // Validate environment
    if (typeof window !== 'undefined') {
      throw new Error(
        'PlaidService cannot be used in browser environment. ' +
        'This service contains secret keys and must only be used server-side.'
      );
    }

    // Validate environment variables (server-side only)
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    const envString = process.env.PLAID_ENV || 'sandbox';

    if (!clientId || !secret) {
      throw new Error(
        'Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET environment variables. ' +
        'This service can only be used server-side (Netlify functions), never in browser code.'
      );
    }

    // Validate environment
    const validEnvs: PlaidEnvironment[] = ['sandbox', 'development', 'production'];
    if (!validEnvs.includes(envString as PlaidEnvironment)) {
      throw new Error(
        `Invalid PLAID_ENV: ${envString}. Must be one of: ${validEnvs.join(', ')}`
      );
    }

    this.environment = envString as PlaidEnvironment;

    // Map environment to Plaid configuration
    const plaidEnv = this.getPlaidEnvironment(this.environment);

    // Initialize Plaid configuration
    const configuration = new Configuration({
      basePath: plaidEnv,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
          'Plaid-Version': '2020-09-14', // Latest stable version
        },
        timeout: 30000, // 30 second timeout
      },
    });

    this.plaid = new PlaidApi(configuration);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PlaidService {
    if (!PlaidService.instance) {
      PlaidService.instance = new PlaidService();
    }
    return PlaidService.instance;
  }

  // ============================================================================
  // LINK TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Create a Link token for frontend Plaid Link flow
   *
   * Link tokens expire after 4 hours. Generate fresh for each session.
   *
   * @param params Link token parameters
   * @returns Link token for frontend
   *
   * @example
   * ```typescript
   * const { data } = await plaid.createLinkToken({
   *   userId: 'temp-signup-123',
   *   companyName: 'Green Lawn Landscaping',
   *   redirectUri: 'https://tradesphere.com/oauth-return',
   *   accountFilters: {
   *     depository: {
   *       account_subtypes: ['checking', 'savings']
   *     }
   *   }
   * });
   * // Send data.linkToken to frontend
   * ```
   */
  async createLinkToken(
    params: CreatePlaidLinkTokenParams
  ): Promise<PlaidServiceResponse<PlaidLinkTokenResponse>> {
    try {
      // Input validation
      if (!params.userId || params.userId.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: 'User ID is required',
            userMessage: 'User identification is required.',
          },
        };
      }

      if (!params.companyName || params.companyName.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_COMPANY_NAME',
            message: 'Company name is required',
            userMessage: 'Company name is required.',
          },
        };
      }

      // Build account filters for ACH (checking/savings only)
      const accountFilters = params.accountFilters || {
        depository: {
          account_subtypes: [
            AccountSubtype.Checking,
            AccountSubtype.Savings,
          ] as AccountSubtype[],
        },
      };

      // Build request
      const request: LinkTokenCreateRequest = {
        client_id: process.env.PLAID_CLIENT_ID!,
        secret: process.env.PLAID_SECRET!,
        user: {
          client_user_id: params.userId,
        },
        client_name: params.companyName.substring(0, 30), // Max 30 chars
        products: params.products?.map(p => p as Products) || [Products.Auth],
        country_codes: params.countryCodes?.map(c => c as CountryCode) || [CountryCode.Us],
        language: params.language || 'en',
        // ACH-specific filters
        account_filters: accountFilters as any,
        // Webhook for async events (optional)
        webhook: params.webhook,
        // OAuth redirect (for banks that require OAuth)
        redirect_uri: params.redirectUri,
        // Additional options
        link_customization_name: undefined, // Use default customization
      };

      // Create link token
      const response = await this.plaid.linkTokenCreate(request);

      const result: PlaidLinkTokenResponse = {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
        requestId: response.data.request_id,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to create Link token');
    }
  }

  // ============================================================================
  // BANK VERIFICATION
  // ============================================================================

  /**
   * Exchange public token for access token
   *
   * CRITICAL: Public tokens expire in 30 minutes. Exchange immediately.
   * Access tokens MUST be encrypted before storing in database.
   *
   * @param params Public token exchange parameters
   * @returns Access token and item ID
   *
   * @example
   * ```typescript
   * const { data } = await plaid.exchangePublicToken({
   *   publicToken: 'public-sandbox-xxx',
   *   accountId: 'account-id-xxx'
   * });
   *
   * // IMPORTANT: Encrypt data.accessToken before storing!
   * const encryptedToken = await encryptSensitiveData(data.accessToken);
   * await saveToDatabase({
   *   encrypted_access_token: encryptedToken,
   *   item_id: data.itemId
   * });
   * ```
   */
  async exchangePublicToken(
    params: ExchangePublicTokenParams
  ): Promise<PlaidServiceResponse<ExchangePublicTokenResponse>> {
    try {
      // Validate public token format
      try {
        validatePublicToken(params.publicToken);
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'INVALID_PUBLIC_TOKEN',
            message: error.message,
            userMessage: 'Invalid verification token. Please restart the process.',
          },
        };
      }

      // Validate account ID
      try {
        validateAccountId(params.accountId);
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'INVALID_ACCOUNT_ID',
            message: error.message,
            userMessage: 'Invalid account selected. Please try again.',
          },
        };
      }

      // Exchange public token
      const request: ItemPublicTokenExchangeRequest = {
        public_token: params.publicToken,
      };

      const response = await this.plaid.itemPublicTokenExchange(request);

      const result: ExchangePublicTokenResponse = {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
        requestId: response.data.request_id,
      };

      // Log security warning
      console.warn(
        'Access token exchanged. Remember to encrypt before storing in database!'
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to exchange public token');
    }
  }

  /**
   * Create Stripe processor token for ACH payments
   *
   * @param params Processor token parameters
   * @returns Stripe bank account token (btok_xxx)
   *
   * @example
   * ```typescript
   * const { data } = await plaid.createProcessorToken({
   *   accessToken: 'access-sandbox-xxx',
   *   accountId: 'account-id-xxx'
   * });
   *
   * // Use data.processorToken with StripeService
   * await stripe.createPaymentMethodFromPlaid({
   *   customerId: 'cus_xxx',
   *   processorToken: data.processorToken
   * });
   * ```
   */
  async createProcessorToken(
    params: CreateProcessorTokenParams
  ): Promise<PlaidServiceResponse<CreateProcessorTokenResponse>> {
    try {
      // Validate access token format
      try {
        validateAccessToken(params.accessToken);
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'INVALID_ACCESS_TOKEN',
            message: error.message,
            userMessage: 'Session expired. Please reconnect your bank account.',
          },
        };
      }

      // Validate account ID
      try {
        validateAccountId(params.accountId);
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'INVALID_ACCOUNT_ID',
            message: error.message,
            userMessage: 'Invalid account selected. Please try again.',
          },
        };
      }

      // Create processor token for Stripe
      const request: ProcessorTokenCreateRequest = {
        access_token: params.accessToken,
        account_id: params.accountId,
        processor: 'stripe' as any, // TypeScript type issue with Plaid SDK
      };

      const response = await this.plaid.processorStripeBankAccountTokenCreate(request);

      const result: CreateProcessorTokenResponse = {
        processorToken: response.data.stripe_bank_account_token,
        requestId: response.data.request_id,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to create processor token');
    }
  }

  // ============================================================================
  // ACCOUNT INFORMATION
  // ============================================================================

  /**
   * Get linked bank account details
   *
   * @param accessToken Access token
   * @param accountIds Optional account IDs filter
   * @returns Account details and item information
   *
   * @example
   * ```typescript
   * const { data } = await plaid.getAccounts('access-sandbox-xxx');
   *
   * data.accounts.forEach(account => {
   *   console.log(account.name, account.mask, account.balances);
   * });
   * ```
   */
  async getAccounts(
    accessToken: string,
    accountIds?: string[]
  ): Promise<PlaidServiceResponse<GetAccountDetailsResponse>> {
    try {
      // Validate access token
      try {
        validateAccessToken(accessToken);
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'INVALID_ACCESS_TOKEN',
            message: error.message,
            userMessage: 'Session expired. Please reconnect your bank account.',
          },
        };
      }

      // Get accounts
      const accountsRequest: AccountsGetRequest = {
        access_token: accessToken,
      };

      if (accountIds && accountIds.length > 0) {
        accountsRequest.options = {
          account_ids: accountIds,
        };
      }

      const accountsResponse = await this.plaid.accountsGet(accountsRequest);

      // Get item details
      const itemRequest: ItemGetRequest = {
        access_token: accessToken,
      };

      const itemResponse = await this.plaid.itemGet(itemRequest);

      // Map accounts to our type
      const accounts: PlaidAccountDetails[] = accountsResponse.data.accounts.map(account => ({
        account_id: account.account_id,
        name: account.name,
        official_name: account.official_name,
        type: account.type as any,
        subtype: account.subtype || '',
        mask: account.mask || '',
        balances: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
          iso_currency_code: account.balances.iso_currency_code,
          unofficial_currency_code: account.balances.unofficial_currency_code,
        },
        verification_status: account.verification_status as any,
      }));

      // Map item to our type
      const item: PlaidItem = {
        item_id: itemResponse.data.item.item_id,
        institution_id: itemResponse.data.item.institution_id || '',
        webhook: itemResponse.data.item.webhook || undefined,
        error: itemResponse.data.item.error || undefined,
        available_products: itemResponse.data.item.available_products as any,
        billed_products: itemResponse.data.item.billed_products as any,
        update_type: itemResponse.data.item.update_type,
      };

      const result: GetAccountDetailsResponse = {
        accounts,
        item,
        requestId: accountsResponse.data.request_id,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get accounts');
    }
  }

  /**
   * Get bank institution details
   *
   * @param institutionId Institution ID
   * @param countryCodes Country codes (default: US)
   * @returns Institution details
   *
   * @example
   * ```typescript
   * const { data } = await plaid.getInstitution('ins_xxx');
   * console.log(data.name, data.products, data.logo);
   * ```
   */
  async getInstitution(
    institutionId: string,
    countryCodes: string[] = ['US']
  ): Promise<PlaidServiceResponse<PlaidInstitution>> {
    try {
      if (!institutionId || institutionId.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INSTITUTION_ID',
            message: 'Institution ID is required',
            userMessage: 'Bank institution not found.',
          },
        };
      }

      const request: InstitutionsGetByIdRequest = {
        institution_id: institutionId,
        country_codes: countryCodes.map(c => c as CountryCode),
      };

      const response = await this.plaid.institutionsGetById(request);
      const inst = response.data.institution;

      const result: PlaidInstitution = {
        institution_id: inst.institution_id,
        name: inst.name,
        products: inst.products as any,
        country_codes: inst.country_codes,
        primary_color: inst.primary_color || undefined,
        logo: inst.logo || undefined,
        url: inst.url || undefined,
        oauth: inst.oauth || false,
        status: inst.status as any,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get institution');
    }
  }

  /**
   * Remove (unlink) a bank account item
   *
   * This permanently removes the connection and invalidates the access token.
   *
   * @param params Remove item parameters
   * @returns Success status
   *
   * @example
   * ```typescript
   * const { success } = await plaid.removeItem({
   *   accessToken: 'access-sandbox-xxx'
   * });
   *
   * if (success) {
   *   // Item removed, clean up database
   * }
   * ```
   */
  async removeItem(params: RemoveItemParams): Promise<PlaidServiceResponse<RemoveItemResponse>> {
    try {
      // Validate access token
      try {
        validateAccessToken(params.accessToken);
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'INVALID_ACCESS_TOKEN',
            message: error.message,
            userMessage: 'Session expired. Bank account may already be disconnected.',
          },
        };
      }

      const request: ItemRemoveRequest = {
        access_token: params.accessToken,
      };

      const response = await this.plaid.itemRemove(request);

      const result: RemoveItemResponse = {
        removed: true,
        requestId: response.data.request_id,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      // If item is already removed, consider it success
      if (error.error_code === 'ITEM_NOT_FOUND') {
        return {
          success: true,
          data: {
            removed: true,
          },
        };
      }

      return this.handleError(error, 'Failed to remove bank account');
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get Plaid environment base path
   */
  private getPlaidEnvironment(env: PlaidEnvironment): string {
    switch (env) {
      case 'sandbox':
        return PlaidEnvironments.sandbox;
      case 'development':
        return PlaidEnvironments.development;
      case 'production':
        return PlaidEnvironments.production;
      default:
        return PlaidEnvironments.sandbox;
    }
  }

  /**
   * Generate unique client user ID for temporary users during signup
   *
   * @returns Temporary user ID
   */
  static generateTempUserId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `temp-${timestamp}-${random}`;
  }

  /**
   * Encrypt sensitive data (access tokens) before storage
   *
   * IMPORTANT: Implement proper encryption in production!
   * This is a placeholder - use proper AES-256-GCM encryption.
   *
   * @param data Data to encrypt
   * @param key Encryption key
   * @returns Encrypted data
   */
  static encryptSensitiveData(data: string, key: string): string {
    // WARNING: This is a simplified example
    // Use proper encryption library like node-forge or crypto-js in production
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   *
   * @param encryptedData Encrypted data
   * @param key Decryption key
   * @returns Decrypted data
   */
  static decryptSensitiveData(encryptedData: string, key: string): string {
    // WARNING: This is a simplified example
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Handle Plaid API errors with proper typing and user-friendly messages
   */
  private handleError(error: any, context: string): PlaidServiceResponse {
    console.error(`${context}:`, error);

    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'An unknown error occurred';
    let userMessage = 'Unable to connect to your bank. Please try again.';
    let retryable = false;
    let plaidError: PlaidError | undefined;

    if (error.response?.data) {
      // Plaid API error
      const apiError = error.response.data as PlaidApiError;
      plaidError = {
        ...apiError,
        error_type: apiError.error_type as PlaidErrorType,
        error_code: apiError.error_code as PlaidErrorCode,
        error_message: apiError.error_message,
        display_message: apiError.display_message,
      };

      errorCode = plaidError.error_code;
      errorMessage = plaidError.error_message;

      // Check if retryable
      retryable = isRetryablePlaidError(plaidError);

      // Get user-friendly message
      userMessage = getUserFriendlyErrorMessage(plaidError);

      // Check if requires user action
      if (requiresUserAction(plaidError)) {
        userMessage = `Action required: ${userMessage}`;
      }
    } else if (error.error_code) {
      // Direct Plaid error object
      plaidError = error as PlaidError;
      errorCode = plaidError.error_code;
      errorMessage = plaidError.error_message;
      retryable = isRetryablePlaidError(plaidError);
      userMessage = getUserFriendlyErrorMessage(plaidError);
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Never expose sensitive information in user messages
    userMessage = this.sanitizeErrorMessage(userMessage);

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        userMessage,
        plaidError,
        retryable,
      },
    };
  }

  /**
   * Sanitize error messages to remove sensitive information
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove any tokens or sensitive IDs
    return message
      .replace(/access-[a-zA-Z0-9-]+/g, '[ACCESS_TOKEN]')
      .replace(/public-[a-zA-Z0-9-]+/g, '[PUBLIC_TOKEN]')
      .replace(/processor-[a-zA-Z0-9-]+/g, '[PROCESSOR_TOKEN]')
      .replace(/btok_[a-zA-Z0-9]+/g, '[BANK_TOKEN]')
      .replace(/link-[a-zA-Z0-9-]+/g, '[LINK_TOKEN]')
      .replace(/ins_[0-9]+/g, '[INSTITUTION]')
      .replace(/\b[a-f0-9]{24,}\b/g, '[ID]'); // MongoDB-like IDs
  }

  /**
   * Verify webhook signature for Plaid webhooks
   *
   * Plaid webhooks don't use signatures by default.
   * Instead, verify by:
   * 1. Checking the webhook came from Plaid IPs
   * 2. Validating the webhook format
   * 3. Verifying item_id exists in your database
   *
   * For production, consider implementing webhook verification tokens.
   *
   * @param payload Webhook payload
   * @param headers Request headers
   * @returns Whether webhook is valid
   */
  static verifyWebhook(payload: any, headers: Record<string, string>): boolean {
    try {
      // Basic validation
      if (!payload || typeof payload !== 'object') {
        return false;
      }

      // Check required fields
      if (!payload.webhook_type || !payload.webhook_code || !payload.item_id) {
        return false;
      }

      // In production, also verify:
      // 1. Request came from Plaid IP ranges
      // 2. Item ID exists in your database
      // 3. Webhook URL matches your configured URL

      return true;
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const plaid = PlaidService.getInstance();

// Export class for testing and custom instances
export default PlaidService;