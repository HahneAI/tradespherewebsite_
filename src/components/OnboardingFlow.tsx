import React, { useState } from 'react';
import { User, Settings, Users, Globe, Monitor, Play, ArrowRight, ArrowLeft, Terminal, Mail, Building, Landmark, Check, Loader, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from './Header';
import { validateEmail, validateCompanyName, validateRoutingNumber, validateAccountNumber, validateAccountHolderName } from '../utils/validation';

interface FormData {
  companyEmail: string;
  companyName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  accountHolderName: string;
  acceptedTerms: boolean;
  achAgreement: boolean;
}

interface FormErrors {
  companyEmail?: string;
  companyName?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountHolderName?: string;
  acceptedTerms?: string;
  achAgreement?: string;
}

const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('ai-pricing');

  // Form state for Step 3
  const [formData, setFormData] = useState<FormData>({
    companyEmail: '',
    companyName: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking',
    accountHolderName: '',
    acceptedTerms: false,
    achAgreement: false
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [, setCustomerData] = useState<{customerId?: string, fundingSourceUrl?: string} | null>(null);
  const [error, setError] = useState<string>('');

  const demoTabs = [
    { id: 'ai-pricing', label: 'AI Pricing Engine', icon: Terminal },
    { id: 'icon-customization', label: 'Icon Customization', icon: Settings },
    { id: 'team-management', label: 'Team Management', icon: Users },
    { id: 'system-integration', label: 'System Integration', icon: Globe }
  ];

  const features = [
    { icon: User, text: 'Dynamic user icon functionality' },
    { icon: Settings, text: 'Complete name customization system' },
    { icon: Users, text: 'Customer details dropdown management' },
    { icon: Terminal, text: 'Interactive bulletin board system' },
    { icon: Monitor, text: 'Light/dark mode switching' }
  ];

  // Form handling functions
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    const emailValidation = validateEmail(formData.companyEmail);
    if (!emailValidation.isValid) {
      errors.companyEmail = emailValidation.error;
    }

    const nameValidation = validateCompanyName(formData.companyName);
    if (!nameValidation.isValid) {
      errors.companyName = nameValidation.error;
    }

    const routingValidation = validateRoutingNumber(formData.routingNumber);
    if (!routingValidation.isValid) {
      errors.routingNumber = routingValidation.error;
    }

    const accountValidation = validateAccountNumber(formData.accountNumber);
    if (!accountValidation.isValid) {
      errors.accountNumber = accountValidation.error;
    }

    const holderNameValidation = validateAccountHolderName(formData.accountHolderName);
    if (!holderNameValidation.isValid) {
      errors.accountHolderName = holderNameValidation.error;
    }

    if (!formData.acceptedTerms) {
      errors.acceptedTerms = 'You must accept the terms and conditions';
    }

    if (!formData.achAgreement) {
      errors.achAgreement = 'You must accept the ACH agreement';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 3) {
      if (!validateForm()) return;

      setIsLoading(true);
      setError('');

      try {
        // Step 1: Create Dwolla customer and bank account
        const customerResponse = await fetch('/api/create-dwolla-customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyEmail: formData.companyEmail,
            companyName: formData.companyName,
            routingNumber: formData.routingNumber,
            accountNumber: formData.accountNumber,
            accountType: formData.accountType,
            accountHolderName: formData.accountHolderName
          })
        });

        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          throw new Error(errorData.message || 'Failed to create customer');
        }

        const customerData = await customerResponse.json();
        setCustomerData({
          customerId: customerData.customerId,
          fundingSourceUrl: customerData.fundingSourceUrl
        });

        // Step 2: Process payment
        const paymentResponse = await fetch('/api/process-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: customerData.customerId,
            customerFundingSourceUrl: customerData.fundingSourceUrl,
            amount: 2000,
            companyEmail: formData.companyEmail,
            companyName: formData.companyName
          })
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.message || 'Failed to process payment');
        }

        await paymentResponse.json();

        setIsLoading(false);
        setPaymentProcessed(true);

        // Note: Company creation will be triggered by the webhook when payment completes
        // For now, show success and redirect to next step
        setTimeout(() => {
          setCurrentStep(4);
          setPaymentProcessed(false);
        }, 3000);

      } catch (error) {
        console.error('Payment processing error:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setIsLoading(false);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleStartDemo = () => {
    setCurrentStep(3); // Jump to payment step for demo
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 pt-24">
        {/* Step Counter Bar */}
        <div className="border-b border-gray-700/50 bg-slate-900/80 backdrop-blur-sm py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-green-400 font-mono text-sm">// onboarding.init()</span>
                <div className="text-gray-300 font-mono text-sm">
                  Step {currentStep} of 10
                </div>
              </div>
              <div className="w-32 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back to Home Link */}
          <Link
            to="/"
            className="inline-flex items-center text-gray-400 hover:text-blue-400 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        {currentStep === 1 && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-cyan-400/20 border border-blue-500/30 rounded-full mb-6">
                <Terminal className="h-4 w-4 text-cyan-400 mr-2" />
                <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">
                  System Initialization
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Revolutionary AI Pricing
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  For Field Service
                </span>
              </h1>

              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
                Initialize your field service transformation with our advanced AI-powered pricing engine.
                Experience the future of dynamic quote generation and team management.
              </p>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto">
            {/* ACH Setup Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-cyan-400/20 border border-blue-500/30 rounded-full mb-6">
                <Landmark className="h-4 w-4 text-cyan-400 mr-2" />
                <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">
                  ACH Bank Setup
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Complete System
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  Deployment
                </span>
              </h1>

              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                Connect your business bank account for secure ACH payments and lower processing fees.
              </p>
            </div>

            {/* Payment Form */}
            <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 p-8 md:p-12">
              {error && (
                <div className="mb-6 p-4 bg-red-600/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 font-mono text-sm">ERROR</span>
                  </div>
                  <p className="text-red-300 mt-2">{error}</p>
                </div>
              )}

              {paymentProcessed ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">ACH Payment Initiated</h3>
                  <p className="text-green-400 font-mono">Processing payment...</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Your company account will be created automatically when payment completes (3-5 business days)
                  </p>
                </div>
              ) : (
                <>
                  {/* Company Information */}
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {/* Company Email */}
                    <div>
                      <label className="block text-gray-300 font-medium mb-3">
                        <Mail className="inline h-4 w-4 mr-2" />
                        Company Email
                      </label>
                      <input
                        type="email"
                        value={formData.companyEmail}
                        onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                        className={`w-full px-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                          formErrors.companyEmail
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-600 focus:ring-blue-500'
                        }`}
                        placeholder="admin@yourcompany.com"
                      />
                      {formErrors.companyEmail && (
                        <p className="text-red-400 text-sm mt-2 font-mono">{formErrors.companyEmail}</p>
                      )}
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="block text-gray-300 font-medium mb-3">
                        <Building className="inline h-4 w-4 mr-2" />
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        className={`w-full px-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                          formErrors.companyName
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-600 focus:ring-blue-500'
                        }`}
                        placeholder="Your Company Inc."
                      />
                      {formErrors.companyName && (
                        <p className="text-red-400 text-sm mt-2 font-mono">{formErrors.companyName}</p>
                      )}
                    </div>
                  </div>

                  {/* Bank Account Information */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                      <Landmark className="inline h-5 w-5 mr-2" />
                      Bank Account Information
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Routing Number */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-3">
                          Bank Routing Number
                        </label>
                        <input
                          type="text"
                          value={formData.routingNumber}
                          onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all font-mono ${
                            formErrors.routingNumber
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-600 focus:ring-blue-500'
                          }`}
                          placeholder="123456789"
                          maxLength={9}
                        />
                        {formErrors.routingNumber && (
                          <p className="text-red-400 text-sm mt-2 font-mono">{formErrors.routingNumber}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-1">9-digit number found on your checks</p>
                      </div>

                      {/* Account Number */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-3">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={formData.accountNumber}
                          onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all font-mono ${
                            formErrors.accountNumber
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-600 focus:ring-blue-500'
                          }`}
                          placeholder="Account number"
                        />
                        {formErrors.accountNumber && (
                          <p className="text-red-400 text-sm mt-2 font-mono">{formErrors.accountNumber}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Account Type */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-3">
                          Account Type
                        </label>
                        <select
                          value={formData.accountType}
                          onChange={(e) => handleInputChange('accountType', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>

                      {/* Account Holder Name */}
                      <div>
                        <label className="block text-gray-300 font-medium mb-3">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          value={formData.accountHolderName}
                          onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                            formErrors.accountHolderName
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-600 focus:ring-blue-500'
                          }`}
                          placeholder="John Doe"
                        />
                        {formErrors.accountHolderName && (
                          <p className="text-red-400 text-sm mt-2 font-mono">{formErrors.accountHolderName}</p>
                        )}
                      </div>
                    </div>

                    {/* Enterprise Security Notice */}
                    <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-blue-300 font-medium">Enterprise-Grade Security</h4>
                          <p className="text-gray-400 text-sm mt-1">
                            Secure enterprise ACH processing with 256-bit SSL encryption and SOC 2 compliance.
                            We partner with Dwolla for bank-level security and enterprise financial infrastructure.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enterprise ACH Subscription Plan */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-4">
                      <Terminal className="inline h-4 w-4 mr-2" />
                      Enterprise ACH Subscription
                    </h3>
                    <div className="bg-gradient-to-r from-blue-600/10 to-cyan-400/10 border border-blue-500/30 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white mb-2">Enterprise-Grade AI Pricing Platform</h4>
                          <p className="text-gray-300 mb-2">Investment in AI-powered efficiency that pays for itself</p>
                          <p className="text-cyan-400 text-sm font-mono">✓ Typical ROI within 60 days</p>
                        </div>
                        <div className="text-right ml-6">
                          <div className="text-4xl font-bold text-white">$2,000</div>
                          <div className="text-gray-400 font-mono text-sm">/month</div>
                          <div className="text-xs text-gray-500 mt-1">via ACH transfer</div>
                        </div>
                      </div>

                      <div className="border-t border-gray-600/50 pt-4 mt-4">
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center text-green-400">
                              <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>Replace manual quoting processes</span>
                            </div>
                            <div className="flex items-center text-green-400">
                              <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>Scale your pricing intelligence</span>
                            </div>
                            <div className="flex items-center text-green-400">
                              <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>AI that pays for itself</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center text-cyan-400">
                              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>3-5 business days processing</span>
                            </div>
                            <div className="flex items-center text-yellow-400">
                              <Terminal className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>Save thousands vs traditional methods</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enterprise Bank Verification */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-4">
                      <Shield className="inline h-4 w-4 mr-2" />
                      Enterprise Account Verification
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-2">Instant Enterprise Verification</h4>
                        <p className="text-gray-400 text-sm mb-3">
                          Secure enterprise banking integration with real-time verification
                        </p>
                        <div className="text-cyan-400 text-sm font-mono">Enterprise Feature</div>
                      </div>
                      <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-2">Secure Micro-deposit Verification</h4>
                        <p className="text-gray-400 text-sm mb-3">
                          Enterprise-grade verification with encrypted micro-deposits (1-2 business days)
                        </p>
                        <div className="text-green-400 text-sm font-mono">Standard Enterprise Method</div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="mb-8 space-y-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptedTerms}
                        onChange={(e) => handleInputChange('acceptedTerms', e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-900/50 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-300">
                        I accept the{' '}
                        <a href="#" className="text-blue-400 hover:text-blue-300 underline">
                          Terms & Conditions
                        </a>{' '}
                        and{' '}
                        <a href="#" className="text-blue-400 hover:text-blue-300 underline">
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {formErrors.acceptedTerms && (
                      <p className="text-red-400 text-sm mt-2 font-mono">{formErrors.acceptedTerms}</p>
                    )}

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.achAgreement}
                        onChange={(e) => handleInputChange('achAgreement', e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-900/50 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-300">
                        I authorize Trade-Sphere to initiate ACH debits and credits to my bank account according to the{' '}
                        <a href="#" className="text-blue-400 hover:text-blue-300 underline">
                          ACH Agreement
                        </a>{' '}
                        and understand that ACH transactions may take 3-5 business days to process.
                      </span>
                    </label>
                    {formErrors.achAgreement && (
                      <p className="text-red-400 text-sm mt-2 font-mono">{formErrors.achAgreement}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-500 hover:text-white transition-all"
                    >
                      Back to Demo
                    </button>

                    <button
                      onClick={handleNext}
                      disabled={isLoading}
                      className="group bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Setup ACH Payment</span>
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600/20 to-blue-400/20 border border-green-500/30 rounded-full mb-8">
              <Check className="h-4 w-4 text-green-400 mr-2" />
              <span className="text-green-400 font-mono text-sm uppercase tracking-wider">
                Setup Complete
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Welcome to Trade-Sphere!
            </h1>

            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Your AI-powered field service system is now active and ready for deployment.
            </p>

            <button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-600 transition-all">
              Access Dashboard
            </button>
          </div>
        )}

        {currentStep === 1 && (
          <>

        {/* Demo Section */}
        <div className="mb-16">
          {/* Demo Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {demoTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg border transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Demo Embed Area */}
          <div className="relative">
            <div className="aspect-video bg-white rounded-xl border-4 border-gray-700 shadow-2xl overflow-hidden">
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                  <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-700 mb-2">
                    {demoTabs.find(tab => tab.id === activeTab)?.label} Demo
                  </h3>
                  <p className="text-gray-500">Interactive demo will be embedded here</p>
                </div>
              </div>
            </div>
            {/* Tech overlay effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/10 to-cyan-400/10 rounded-2xl blur-xl -z-10" />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Feature Highlights */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">
              <span className="text-green-400 font-mono">&gt;</span> System Features
            </h2>
            <div className="space-y-6">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-gray-200 font-medium">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Status */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">
              <span className="text-yellow-400 font-mono">$</span> System Status
            </h2>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 font-mono text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">AI Engine:</span>
                  <span className="text-green-400">READY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Database:</span>
                  <span className="text-green-400">CONNECTED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Security:</span>
                  <span className="text-green-400">AUTHENTICATED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Integration APIs:</span>
                  <span className="text-yellow-400">INITIALIZING</span>
                </div>
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="text-cyan-400">
                    &gt; System ready for deployment
                  </div>
                  <div className="text-gray-500 mt-1">
                    Initialize your workspace to continue...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={handleNext}
              className="group bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-600 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Initialize Demo</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleStartDemo}
              className="group border-2 border-gray-600 text-gray-300 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-500 hover:text-white transition-all duration-200 hover:bg-gray-800/30 flex items-center space-x-2"
            >
              <Terminal className="h-5 w-5" />
              <span>Begin Setup Process</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <p className="text-gray-500 mt-6 font-mono text-sm">
            // Continue to complete system initialization
          </p>
        </div>
        </>
        )}
      </main>
      </div>
    </>
  );
};

export default OnboardingFlow;