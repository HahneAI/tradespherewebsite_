// Email validation utility function
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check for business domain (avoid common personal email providers)
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'aol.com', 'icloud.com', 'me.com', 'live.com'
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  if (personalDomains.includes(domain)) {
    return { isValid: false, error: 'Please use a business email address' };
  }

  return { isValid: true };
};

// Company name validation
export const validateCompanyName = (name: string): { isValid: boolean; error?: string } => {
  if (!name) {
    return { isValid: false, error: 'Company name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Company name must be at least 2 characters' };
  }

  return { isValid: true };
};

// Bank routing number validation (ABA routing number format)
export const validateRoutingNumber = (routingNumber: string): { isValid: boolean; error?: string } => {
  if (!routingNumber) {
    return { isValid: false, error: 'Routing number is required' };
  }

  // Remove any non-digits
  const digits = routingNumber.replace(/\D/g, '');

  if (digits.length !== 9) {
    return { isValid: false, error: 'Routing number must be exactly 9 digits' };
  }

  // ABA routing number checksum validation
  const checksum = (3 * (parseInt(digits[0]) + parseInt(digits[3]) + parseInt(digits[6]))) +
                   (7 * (parseInt(digits[1]) + parseInt(digits[4]) + parseInt(digits[7]))) +
                   (1 * (parseInt(digits[2]) + parseInt(digits[5]) + parseInt(digits[8])));

  if (checksum % 10 !== 0) {
    return { isValid: false, error: 'Please enter a valid routing number' };
  }

  return { isValid: true };
};

// Account number validation
export const validateAccountNumber = (accountNumber: string): { isValid: boolean; error?: string } => {
  if (!accountNumber) {
    return { isValid: false, error: 'Account number is required' };
  }

  // Remove any non-digits and hyphens
  const cleaned = accountNumber.replace(/[^\d-]/g, '');

  if (cleaned.length < 4 || cleaned.length > 17) {
    return { isValid: false, error: 'Account number must be between 4-17 digits' };
  }

  return { isValid: true };
};

// Account holder name validation
export const validateAccountHolderName = (name: string): { isValid: boolean; error?: string } => {
  if (!name) {
    return { isValid: false, error: 'Account holder name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Account holder name must be at least 2 characters' };
  }

  // Check for valid name characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  if (!nameRegex.test(name.trim())) {
    return { isValid: false, error: 'Please enter a valid name (letters, spaces, hyphens only)' };
  }

  return { isValid: true };
};