/**
 * PHASE 4B: DWOLLA ACH PAYMENT SERVICE
 *
 * Centralized service for Dwolla API integration.
 * Handles customer creation, bank account verification, and ACH transfers.
 *
 * IMPORTANT: This service can be used by BOTH the website (owner signup)
 * and the app (subscription management).
 */

import { Client } from 'dwolla-v2';
import type {
  CreateCustomerParams,
  CreateCustomerResponse,
  CreateFundingSourceParams,
  CreateFundingSourceResponse,
  VerifyMicroDepositsParams,
  CreateTransferParams,
  CreateTransferResponse,
  DwollaCustomer,
  DwollaFundingSource,
  DwollaTransfer,
  FundingSourcesList,
  TransfersList,
  DwollaResponse
} from '../types/payment';

export class DwollaService {
  private dwolla: Client;
  private static instance: DwollaService;

  /**
   * Private constructor for singleton pattern
   *
   * SECURITY: Dwolla credentials must ONLY be available server-side.
   * This service should only be used in Netlify functions, never in browser code.
   */
  private constructor() {
    // Validate environment variables (server-side only)
    const appKey = process.env.DWOLLA_APP_KEY;
    const appSecret = process.env.DWOLLA_APP_SECRET;
    const environment = (process.env.DWOLLA_ENVIRONMENT || 'sandbox') as 'production' | 'sandbox';

    if (!appKey || !appSecret) {
      throw new Error(
        'Dwolla credentials not configured. Set DWOLLA_APP_KEY and DWOLLA_APP_SECRET environment variables. ' +
        'This service can only be used server-side (Netlify functions), never in browser code.'
      );
    }

    this.dwolla = new Client({
      key: appKey,
      secret: appSecret,
      environment
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DwollaService {
    if (!DwollaService.instance) {
      DwollaService.instance = new DwollaService();
    }
    return DwollaService.instance;
  }

  /**
   * Create a Dwolla customer for a new company
   *
   * @param params Customer creation parameters
   * @returns Customer URL and ID
   *
   * @example
   * const { data } = await dwolla.createCustomer({
   *   email: 'owner@company.com',
   *   companyName: 'ABC Landscaping',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   businessType: 'llc'
   * });
   * console.log(data.customerUrl); // https://api.dwolla.com/customers/uuid
   */
  async createCustomer(params: CreateCustomerParams): Promise<CreateCustomerResponse> {
    try {
      const requestBody: any = {
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        type: 'business',
        businessName: params.companyName
      };

      // Optional business details
      if (params.businessType) {
        requestBody.businessType = params.businessType;
      }

      if (params.businessClassification) {
        requestBody.businessClassification = params.businessClassification;
      } else {
        // Default to Landscaping Services if not provided
        requestBody.businessClassification = '9ed3f670-7d6f-11e3-b1ce-5404a6144203';
      }

      if (params.ein) {
        requestBody.ein = params.ein;
      }

      // Optional address
      if (params.address1) {
        requestBody.address1 = params.address1;
        requestBody.city = params.city;
        requestBody.state = params.state;
        requestBody.postalCode = params.postalCode;
      }

      const customer = await this.dwolla.post('customers', requestBody);
      const customerUrl = customer.headers.get('location');

      return {
        success: true,
        data: {
          customerUrl,
          customerId: this.extractIdFromUrl(customerUrl)
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Create a funding source (bank account) for a customer
   *
   * @param params Funding source creation parameters
   * @returns Funding source URL and ID
   *
   * @example
   * const { data } = await dwolla.createFundingSource({
   *   customerUrl: 'https://api.dwolla.com/customers/uuid',
   *   routingNumber: '222222226',
   *   accountNumber: '123456789',
   *   bankAccountType: 'checking',
   *   name: 'Company Checking Account'
   * });
   */
  async createFundingSource(params: CreateFundingSourceParams): Promise<CreateFundingSourceResponse> {
    try {
      const requestBody = {
        routingNumber: params.routingNumber,
        accountNumber: params.accountNumber,
        bankAccountType: params.bankAccountType,
        name: params.name
      };

      const fundingSource = await this.dwolla.post(
        `${params.customerUrl}/funding-sources`,
        requestBody
      );

      const fundingSourceUrl = fundingSource.headers.get('location');

      return {
        success: true,
        data: {
          fundingSourceUrl,
          fundingSourceId: this.extractIdFromUrl(fundingSourceUrl)
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Initiate micro-deposit verification for a bank account
   *
   * Dwolla will deposit 2 small amounts (< $0.10 each) into the bank account.
   * Customer must verify these amounts to complete verification.
   *
   * @param fundingSourceUrl Funding source URL to verify
   *
   * @example
   * await dwolla.initiateMicroDeposits(
   *   'https://api.dwolla.com/funding-sources/uuid'
   * );
   * // Dwolla sends 2 micro-deposits to the bank account (1-3 business days)
   * // Customer receives amounts and calls verifyMicroDeposits()
   */
  async initiateMicroDeposits(fundingSourceUrl: string): Promise<DwollaResponse> {
    try {
      await this.dwolla.post(`${fundingSourceUrl}/micro-deposits`, {});

      return {
        success: true,
        data: {
          message: 'Micro-deposits initiated. Deposits will arrive in 1-3 business days.'
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Verify micro-deposit amounts to complete bank account verification
   *
   * @param params Verification parameters (funding source URL + amounts)
   *
   * @example
   * const { success } = await dwolla.verifyMicroDeposits({
   *   fundingSourceUrl: 'https://api.dwolla.com/funding-sources/uuid',
   *   amount1: 0.03,  // $0.03
   *   amount2: 0.09   // $0.09
   * });
   *
   * if (success) {
   *   // Bank account is now verified!
   *   // Webhook: customer_funding_source_verified will fire
   * }
   */
  async verifyMicroDeposits(params: VerifyMicroDepositsParams): Promise<DwollaResponse> {
    try {
      await this.dwolla.post(`${params.fundingSourceUrl}/micro-deposits`, {
        amount1: {
          value: params.amount1.toFixed(2),
          currency: 'USD'
        },
        amount2: {
          value: params.amount2.toFixed(2),
          currency: 'USD'
        }
      });

      return {
        success: true,
        data: {
          message: 'Bank account verified successfully!'
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Create an ACH transfer (payment) from customer to TradeSphere
   *
   * Used for monthly subscription payments.
   *
   * @param params Transfer parameters
   * @returns Transfer URL and ID
   *
   * @example
   * const { data } = await dwolla.createTransfer({
   *   sourceFundingSourceUrl: 'https://api.dwolla.com/funding-sources/customer-bank',
   *   destinationFundingSourceUrl: 'https://api.dwolla.com/funding-sources/tradesphere-bank',
   *   amount: 2000.00,  // $2000 monthly subscription
   *   metadata: {
   *     company_id: 'uuid',
   *     billing_period: '2025-01-01',
   *     invoice_id: 'INV-12345'
   *   }
   * });
   *
   * // Transfer processes in 1-3 business days
   * // Webhook: customer_transfer_completed will fire when done
   */
  async createTransfer(params: CreateTransferParams): Promise<CreateTransferResponse> {
    try {
      const requestBody: any = {
        _links: {
          source: {
            href: params.sourceFundingSourceUrl
          },
          destination: {
            href: params.destinationFundingSourceUrl
          }
        },
        amount: {
          currency: 'USD',
          value: params.amount.toFixed(2)
        }
      };

      // Add metadata for tracking (company_id, invoice_id, etc.)
      if (params.metadata) {
        requestBody.metadata = params.metadata;
      }

      const transfer = await this.dwolla.post('transfers', requestBody);
      const transferUrl = transfer.headers.get('location');

      // Get transfer status immediately
      const transferData = await this.getTransfer(transferUrl);

      return {
        success: true,
        data: {
          transferUrl,
          transferId: this.extractIdFromUrl(transferUrl),
          status: transferData.status
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Get transfer details and status
   *
   * @param transferUrl Transfer URL from createTransfer()
   * @returns Transfer details
   *
   * @example
   * const transfer = await dwolla.getTransfer(
   *   'https://api.dwolla.com/transfers/uuid'
   * );
   * console.log(transfer.status); // 'pending', 'processed', 'failed'
   */
  async getTransfer(transferUrl: string): Promise<DwollaTransfer> {
    const transfer = await this.dwolla.get(transferUrl);
    return transfer.body as DwollaTransfer;
  }

  /**
   * Cancel a pending transfer
   *
   * Only works if transfer is still in 'pending' status.
   *
   * @param transferUrl Transfer URL to cancel
   */
  async cancelTransfer(transferUrl: string): Promise<DwollaResponse> {
    try {
      await this.dwolla.post(transferUrl, {
        status: 'cancelled'
      });

      return {
        success: true,
        data: {
          message: 'Transfer cancelled successfully'
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Get all funding sources for a customer
   *
   * @param customerUrl Customer URL
   * @returns List of funding sources (bank accounts)
   *
   * @example
   * const fundingSources = await dwolla.getFundingSources(
   *   'https://api.dwolla.com/customers/uuid'
   * );
   *
   * fundingSources.forEach(fs => {
   *   console.log(fs.name, fs.status, fs.bankAccountType);
   * });
   */
  async getFundingSources(customerUrl: string): Promise<DwollaFundingSource[]> {
    const response = await this.dwolla.get(`${customerUrl}/funding-sources`);
    const data = response.body as FundingSourcesList;
    return data._embedded['funding-sources'];
  }

  /**
   * Remove (unlink) a funding source
   *
   * Marks the bank account as removed. Cannot be undone.
   *
   * @param fundingSourceUrl Funding source URL to remove
   */
  async removeFundingSource(fundingSourceUrl: string): Promise<DwollaResponse> {
    try {
      await this.dwolla.post(fundingSourceUrl, {
        removed: true
      });

      return {
        success: true,
        data: {
          message: 'Funding source removed successfully'
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Get all transfers for a customer (payment history)
   *
   * @param customerUrl Customer URL
   * @param limit Number of transfers to retrieve (default 100)
   * @returns List of transfers
   *
   * @example
   * const transfers = await dwolla.getTransfers(
   *   'https://api.dwolla.com/customers/uuid',
   *   10  // Last 10 payments
   * );
   */
  async getTransfers(customerUrl: string, limit: number = 100): Promise<DwollaTransfer[]> {
    const response = await this.dwolla.get(`${customerUrl}/transfers`, {
      limit
    });
    const data = response.body as TransfersList;
    return data._embedded.transfers;
  }

  /**
   * Get customer details
   *
   * @param customerUrl Customer URL
   * @returns Customer details
   */
  async getCustomer(customerUrl: string): Promise<DwollaCustomer> {
    const response = await this.dwolla.get(customerUrl);
    return response.body as DwollaCustomer;
  }

  /**
   * Get funding source details
   *
   * @param fundingSourceUrl Funding source URL
   * @returns Funding source details
   */
  async getFundingSource(fundingSourceUrl: string): Promise<DwollaFundingSource> {
    const response = await this.dwolla.get(fundingSourceUrl);
    return response.body as DwollaFundingSource;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Extract ID from Dwolla resource URL
   *
   * @param url Resource URL (e.g., https://api.dwolla.com/customers/uuid)
   * @returns Resource ID (uuid)
   */
  private extractIdFromUrl(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Handle Dwolla API errors with proper typing
   */
  private handleError(error: any): DwollaResponse {
    console.error('Dwolla API Error:', error);

    let errorMessage = 'An unknown error occurred';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.body) {
      // Dwolla API error response
      const body = error.body;

      if (body.message) {
        errorMessage = body.message;
      }

      if (body.code) {
        errorCode = body.code;
      }

      // Detailed validation errors
      if (body._embedded?.errors) {
        const validationErrors = body._embedded.errors.map((err: any) =>
          `${err.path}: ${err.message}`
        ).join(', ');
        errorMessage = `Validation errors: ${validationErrors}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        _embedded: error.body?._embedded
      }
    };
  }

  /**
   * Verify webhook signature (for webhook handler)
   *
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @param signature X-Request-Signature-SHA-256 header
   * @param payload Raw request body
   * @param secret Webhook secret from Dwolla dashboard
   * @returns True if signature is valid
   *
   * @example
   * const isValid = DwollaService.verifyWebhookSignature(
   *   request.headers['x-request-signature-sha-256'],
   *   request.body,
   *   process.env.DWOLLA_WEBHOOK_SECRET
   * );
   */
  static verifyWebhookSignature(
    signature: string,
    payload: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');

    // Compute expected signature
    const hmac = crypto.createHmac('sha256', secret);
    const computedSignature = hmac.update(payload).digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');

    // Length check (fast path)
    if (sigBuffer.length !== computedBuffer.length) {
      return false;
    }

    // Timing-safe comparison
    return crypto.timingSafeEqual(sigBuffer, computedBuffer);
  }

  /**
   * Format dollar amount for Dwolla API
   *
   * @param amount Amount in dollars (e.g., 2000.50)
   * @returns Formatted string (e.g., "2000.50")
   */
  static formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Parse dollar amount from Dwolla response
   *
   * @param value Amount string from Dwolla (e.g., "2000.50")
   * @returns Number (e.g., 2000.50)
   */
  static parseAmount(value: string): number {
    return parseFloat(value);
  }
}

// Export singleton instance
export const dwolla = DwollaService.getInstance();

// Export class for testing and custom instances
export default DwollaService;
