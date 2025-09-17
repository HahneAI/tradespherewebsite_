import React, { useState } from 'react';
import { User, Settings, Users, Globe, Monitor, Play, ArrowRight, Terminal, Mail, Building, CreditCard, Check, Loader } from 'lucide-react';
import { validateEmail, validateCompanyName } from '../utils/validation';

interface FormData {
  companyEmail: string;
  companyName: string;
  acceptedTerms: boolean;
}

interface FormErrors {
  companyEmail?: string;
  companyName?: string;
  acceptedTerms?: string;
}

const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('ai-pricing');

  // Form state for Step 3
  const [formData, setFormData] = useState<FormData>({
    companyEmail: '',
    companyName: '',
    acceptedTerms: false
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProcessed, setPaymentProcessed] = useState(false);

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

    if (!formData.acceptedTerms) {
      errors.acceptedTerms = 'You must accept the terms and conditions';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 3) {
      if (!validateForm()) return;

      setIsLoading(true);
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsLoading(false);
      setPaymentProcessed(true);

      // After 2 seconds, move to next step
      setTimeout(() => {
        setCurrentStep(4);
        setPaymentProcessed(false);
      }, 2000);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleStartDemo = () => {
    setCurrentStep(3); // Jump to payment step for demo
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="/image_2025-06-18_211614282.png" 
                alt="Trade-Sphere Logo" 
                className="h-10 w-10"
              />
              <div className="flex items-center space-x-4">
                <span className="text-xl font-bold text-white">Trade-Sphere</span>
                <span className="text-green-400 font-mono text-sm">// onboarding.init()</span>
              </div>
            </div>

            {/* Step Counter */}
            <div className="flex items-center space-x-4">
              <div className="text-gray-300 font-mono text-sm">
                Step {currentStep} of 10
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
            {/* Payment Form Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-cyan-400/20 border border-blue-500/30 rounded-full mb-6">
                <CreditCard className="h-4 w-4 text-cyan-400 mr-2" />
                <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">
                  Payment Configuration
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
                Finalize your Trade-Sphere system configuration with business details and subscription setup.
              </p>
            </div>

            {/* Payment Form */}
            <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 p-8 md:p-12">
              {paymentProcessed ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Payment Processed Successfully</h3>
                  <p className="text-green-400 font-mono">System initialization complete...</p>
                </div>
              ) : (
                <>
                  {/* Form Fields */}
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

                  {/* Subscription Plan */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-4">
                      <Terminal className="inline h-4 w-4 mr-2" />
                      Subscription Plan
                    </h3>
                    <div className="bg-gradient-to-r from-blue-600/10 to-cyan-400/10 border border-blue-500/30 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-white">Monthly Subscription</h4>
                          <p className="text-gray-400">Full access to AI pricing engine and all features</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-white">$299</div>
                          <div className="text-gray-400 font-mono text-sm">/month</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="mb-8">
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
                          <span>Complete Setup</span>
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
  );
};

export default OnboardingFlow;