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