import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { BusinessType } from '../types/payment';

// ==============================================================================
// TYPES & INTERFACES
// ==============================================================================

type PlanType = 'standard' | 'pro' | 'enterprise';
type BankAccountType = 'checking' | 'savings';
type IndustryType = 'Landscaping' | 'HVAC' | 'Plumbing' | 'General Contractor' | 'Other';

interface FormData {
  // Step 1: Account Information
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Step 2: Company Information
  companyName: string;
  industry: IndustryType | '';
  businessType: BusinessType | '';

  // Step 3: Bank Account
  bankAccountName: string;
  routingNumber: string;
  accountNumber: string;
  bankAccountType: BankAccountType | '';

  // Step 4: Plan Selection
  plan: PlanType | '';
  agreeToTerms: boolean;
  authorizeACH: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

interface PlanOption {
  id: PlanType;
  name: string;
  price: number;
  features: string[];
}

// ==============================================================================
// COMPONENT
// ==============================================================================

const OwnerRegistrationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    industry: '',
    businessType: '',
    bankAccountName: '',
    routingNumber: '',
    accountNumber: '',
    bankAccountType: '',
    plan: '',
    agreeToTerms: false,
    authorizeACH: false,
  });

  // Pre-fill plan from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan');

    if (planParam && ['standard', 'pro', 'enterprise'].includes(planParam)) {
      setFormData(prev => ({ ...prev, plan: planParam as PlanType }));
    }
  }, []);

  // ==============================================================================
  // PLAN OPTIONS
  // ==============================================================================

  const plans: PlanOption[] = [
    {
      id: 'standard',
      name: 'Standard Plan',
      price: 2000,
      features: [
        'Up to 10 users',
        'AI-powered quoting',
        'Smart scheduling',
        'Customer management',
        'Email support',
      ],
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: 3500,
      features: [
        'Up to 25 users',
        'All Standard features',
        'Real-time crew tracking',
        'Advanced reporting',
        'Priority support',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: 5000,
      features: [
        'Unlimited users',
        'All Pro features',
        'API access',
        'Dedicated account manager',
        '24/7 phone support',
      ],
    },
  ];

  // ==============================================================================
  // VALIDATION FUNCTIONS
  // ==============================================================================

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasMinLength && hasUppercase && hasLowercase && hasNumber;
  };

  const validateRoutingNumber = (routingNumber: string): boolean => {
    // Must be exactly 9 digits
    return /^\d{9}$/.test(routingNumber);
  };

  const validateStep = (step: number): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (step === 1) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (!validatePassword(formData.password)) {
        newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (step === 2) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      }
      if (!formData.industry) {
        newErrors.industry = 'Please select an industry';
      }
      if (!formData.businessType) {
        newErrors.businessType = 'Please select a business type';
      }
    }

    if (step === 3) {
      if (!formData.bankAccountName.trim()) {
        newErrors.bankAccountName = 'Bank account name is required';
      }
      if (!formData.routingNumber.trim()) {
        newErrors.routingNumber = 'Routing number is required';
      } else if (!validateRoutingNumber(formData.routingNumber)) {
        newErrors.routingNumber = 'Routing number must be exactly 9 digits';
      }
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required';
      }
      if (!formData.bankAccountType) {
        newErrors.bankAccountType = 'Please select an account type';
      }
    }

    if (step === 4) {
      if (!formData.plan) {
        newErrors.plan = 'Please select a plan';
      }
      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = 'You must agree to the Terms of Service';
      }
      if (!formData.authorizeACH) {
        newErrors.authorizeACH = 'You must authorize ACH payments';
      }
    }

    return newErrors;
  };

  const isStepValid = (step: number): boolean => {
    const stepErrors = validateStep(step);
    return Object.keys(stepErrors).length === 0;
  };

  // ==============================================================================
  // FORM HANDLERS
  // ==============================================================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all steps
    const step4Errors = validateStep(4);
    if (Object.keys(step4Errors).length > 0) {
      setErrors(step4Errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Prepare data for API
      const apiData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        industry: formData.industry,
        businessType: formData.businessType,
        bankAccountName: formData.bankAccountName,
        routingNumber: formData.routingNumber,
        accountNumber: formData.accountNumber,
        bankAccountType: formData.bankAccountType,
        plan: formData.plan,
        agreeToTerms: formData.agreeToTerms,
        authorizeACH: formData.authorizeACH,
      };

      const response = await fetch('/.netlify/functions/signup-with-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed. Please try again.');
      }

      // Success - redirect to success page
      window.location.href = '/registration-success';
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  // ==============================================================================
  // RENDER HELPERS
  // ==============================================================================

  const renderProgressIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-2">
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                step === currentStep
                  ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white'
                  : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {step < currentStep ? <Check className="h-5 w-5" /> : step}
            </div>
            {step < 4 && (
              <div
                className={`w-12 h-1 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="text-center mt-4">
        <p className="text-gray-300 font-medium">
          Step {currentStep} of 4: {getStepTitle(currentStep)}
        </p>
      </div>
    </div>
  );

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1:
        return 'Account Information';
      case 2:
        return 'Company Information';
      case 3:
        return 'Bank Account';
      case 4:
        return 'Plan Selection';
      default:
        return '';
    }
  };

  const renderInputField = (
    name: keyof FormData,
    label: string,
    type: string = 'text',
    placeholder: string = ''
  ) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name] as string}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={isSubmitting}
        className={`w-full px-4 py-3 bg-gray-700 border ${
          errors[name] ? 'border-red-500' : 'border-gray-600'
        } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {errors[name] && (
        <p className="mt-1 text-sm text-red-400 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {errors[name]}
        </p>
      )}
    </div>
  );

  const renderSelectField = (
    name: keyof FormData,
    label: string,
    options: Array<{ value: string; label: string }>
  ) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={formData[name] as string}
        onChange={handleInputChange}
        disabled={isSubmitting}
        className={`w-full px-4 py-3 bg-gray-700 border ${
          errors[name] ? 'border-red-500' : 'border-gray-600'
        } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errors[name] && (
        <p className="mt-1 text-sm text-red-400 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {errors[name]}
        </p>
      )}
    </div>
  );

  // ==============================================================================
  // STEP RENDERERS
  // ==============================================================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInputField('firstName', 'First Name', 'text', 'John')}
        {renderInputField('lastName', 'Last Name', 'text', 'Smith')}
      </div>
      {renderInputField('email', 'Email Address', 'email', 'john@company.com')}
      {renderInputField('password', 'Password', 'password', 'Create a secure password')}
      {renderInputField('confirmPassword', 'Confirm Password', 'password', 'Re-enter your password')}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {renderInputField('companyName', 'Company Name', 'text', 'Your Company LLC')}
      {renderSelectField('industry', 'Industry', [
        { value: 'Landscaping', label: 'Landscaping' },
        { value: 'HVAC', label: 'HVAC' },
        { value: 'Plumbing', label: 'Plumbing' },
        { value: 'General Contractor', label: 'General Contractor' },
        { value: 'Other', label: 'Other' },
      ])}
      {renderSelectField('businessType', 'Business Type', [
        { value: 'llc', label: 'LLC' },
        { value: 'corporation', label: 'Corporation' },
        { value: 'soleProprietorship', label: 'Sole Proprietorship' },
        { value: 'partnership', label: 'Partnership' },
      ])}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {renderInputField('bankAccountName', 'Bank Account Name', 'text', 'Company Business Checking')}
      {renderInputField('routingNumber', 'Routing Number', 'text', '123456789')}
      {renderInputField('accountNumber', 'Account Number', 'text', 'Your account number')}
      {renderSelectField('bankAccountType', 'Account Type', [
        { value: 'checking', label: 'Checking' },
        { value: 'savings', label: 'Savings' },
      ])}

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Note:</strong> This bank account will be used for your monthly subscription payments via ACH transfer.
        </p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Plan Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-4">
          Select Your Plan
        </label>
        <div className="space-y-4">
          {plans.map((plan) => (
            <label
              key={plan.id}
              className={`block cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div
                className={`relative bg-gray-700 border-2 ${
                  formData.plan === plan.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 hover:border-gray-500'
                } rounded-lg p-6 transition-all`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={formData.plan === plan.id}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                      <span className="text-2xl font-bold text-white">
                        ${plan.price.toLocaleString()}
                        <span className="text-sm text-gray-400 font-normal">/month</span>
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-300">
                          <Check className="h-4 w-4 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
        {errors.plan && (
          <p className="mt-2 text-sm text-red-400 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.plan}
          </p>
        )}
      </div>

      {/* Legal Agreements */}
      <div className="bg-gray-700 border border-gray-600 rounded-lg p-6 space-y-4">
        <h4 className="font-semibold text-white mb-4">Legal Agreements</h4>

        <div>
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`mt-1 h-5 w-5 text-blue-600 border-gray-500 rounded focus:ring-blue-500 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <span className="ml-3 text-gray-300">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-400 hover:text-blue-300 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.agreeToTerms && (
            <p className="mt-1 ml-8 text-sm text-red-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.agreeToTerms}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              name="authorizeACH"
              checked={formData.authorizeACH}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`mt-1 h-5 w-5 text-blue-600 border-gray-500 rounded focus:ring-blue-500 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <span className="ml-3 text-gray-300">
              I authorize Trade-Sphere to charge the provided bank account for monthly subscription fees via ACH transfer
            </span>
          </label>
          {errors.authorizeACH && (
            <p className="mt-1 ml-8 text-sm text-red-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.authorizeACH}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // ==============================================================================
  // MAIN RENDER
  // ==============================================================================

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Create Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Trade-Sphere
            </span>{' '}
            Account
          </h1>
          <p className="text-gray-300 text-lg">
            Complete the registration to start your subscription
          </p>
        </div>

        {/* Progress Indicator */}
        {renderProgressIndicator()}

        {/* Form */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
          {submitError && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-semibold mb-1">Registration Error</h4>
                <p className="text-red-300 text-sm">{submitError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Render Current Step */}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                  className="flex items-center px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Previous
                </button>
              ) : (
                <div></div>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid(currentStep) || isSubmitting}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Next
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !isStepValid(4)}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <Check className="h-5 w-5 ml-2" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Your information is encrypted and secure. We use bank-level security to protect your data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerRegistrationForm;
