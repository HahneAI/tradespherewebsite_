/**
 * PHASE 4C: PAYMENT TYPES
 *
 * TypeScript interfaces for Dwolla API operations.
 * Used by DwollaService and Netlify functions for type safety.
 */

// ==============================================================================
// FUNDING SOURCE TYPES
// ==============================================================================

export type FundingSourceType = 'checking' | 'savings';

export type FundingSourceStatus = 'unverified' | 'verified' | 'pending' | 'removed';

export type BusinessType = 'llc' | 'corporation' | 'soleProprietorship' | 'partnership';

// ==============================================================================
// CUSTOMER CREATION
// ==============================================================================

export interface CreateCustomerParams {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  businessType?: BusinessType;
  businessClassification?: string; // Dwolla business classification ID
  ein?: string; // Employer Identification Number (optional)

  // Optional address fields
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface CreateCustomerResponse extends DwollaResponse {
  data?: {
    customerUrl: string;
    customerId: string;
  };
}

// ==============================================================================
// FUNDING SOURCE CREATION
// ==============================================================================

export interface CreateFundingSourceParams {
  customerUrl: string;
  routingNumber: string;
  accountNumber: string;
  bankAccountType: FundingSourceType;
  name: string; // Bank account nickname (e.g., "Company Checking Account")
}

export interface CreateFundingSourceResponse extends DwollaResponse {
  data?: {
    fundingSourceUrl: string;
    fundingSourceId: string;
  };
}

// ==============================================================================
// MICRO-DEPOSIT VERIFICATION
// ==============================================================================

export interface VerifyMicroDepositsParams {
  fundingSourceUrl: string;
  amount1: number; // First micro-deposit amount (e.g., 0.03)
  amount2: number; // Second micro-deposit amount (e.g., 0.09)
}

// ==============================================================================
// TRANSFER (PAYMENT) CREATION
// ==============================================================================

export interface CreateTransferParams {
  sourceFundingSourceUrl: string;      // Customer's bank account
  destinationFundingSourceUrl: string; // TradeSphere's bank account
  amount: number;                      // Amount in dollars (e.g., 2000.00)
  metadata?: Record<string, string>;   // Optional metadata for tracking
}

export interface CreateTransferResponse extends DwollaResponse {
  data?: {
    transferUrl: string;
    transferId: string;
    status: TransferStatus;
  };
}

// ==============================================================================
// DWOLLA RESOURCE TYPES
// ==============================================================================

export type TransferStatus =
  | 'pending'
  | 'processed'
  | 'failed'
  | 'cancelled';

export interface DwollaCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  type: 'business' | 'personal';
  businessName?: string;
  status: 'unverified' | 'verified' | 'suspended' | 'deactivated';
  created: string;
  _links: Record<string, { href: string }>;
}

export interface DwollaFundingSource {
  id: string;
  status: FundingSourceStatus;
  type: 'bank' | 'balance';
  bankAccountType?: FundingSourceType;
  name: string;
  created: string;
  removed: boolean;
  channels: string[];
  bankName?: string;
  fingerprint?: string;
  _links: Record<string, { href: string }>;
}

export interface DwollaTransfer {
  id: string;
  status: TransferStatus;
  amount: {
    value: string;
    currency: 'USD';
  };
  created: string;
  metadata?: Record<string, string>;
  _links: Record<string, { href: string }>;
}

// ==============================================================================
// DWOLLA API RESPONSE LISTS
// ==============================================================================

export interface FundingSourcesList {
  _embedded: {
    'funding-sources': DwollaFundingSource[];
  };
  total: number;
}

export interface TransfersList {
  _embedded: {
    transfers: DwollaTransfer[];
  };
  total: number;
}

// ==============================================================================
// GENERIC DWOLLA RESPONSE
// ==============================================================================

export interface DwollaResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    _embedded?: any;
  };
}
