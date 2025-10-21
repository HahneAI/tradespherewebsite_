import React from 'react';
import { CheckCircle2, Mail, CreditCard, Settings, Clock, HelpCircle, Phone, FileText } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

/**
 * RegistrationSuccess Component
 *
 * Displays a success message after user registration with clear next steps
 * and important information about the trial period and bank verification process.
 */
const RegistrationSuccess: React.FC = () => {
  const handleOpenEmail = (): void => {
    // Opens default email client with mailto link
    window.location.href = 'mailto:';
  };

  const handleContactSupport = (): void => {
    window.location.href = 'mailto:support@tradesphere.com';
  };

  const calculateTrialEndDate = (): string => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    return endDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  interface NextStep {
    number: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    iconBgColor: string;
    iconColor: string;
  }

  const nextSteps: NextStep[] = [
    {
      number: 1,
      title: 'Check Your Email',
      description: 'Click the link in your welcome email to access your account and verify your email address.',
      icon: <Mail className="w-6 h-6" />,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      number: 2,
      title: 'Verify Your Bank Account',
      description: "We've initiated 2 small deposits (less than $0.10 each) to your bank account. These will appear in 1-3 business days. You'll verify these amounts in your account settings to complete payment setup.",
      icon: <CreditCard className="w-6 h-6" />,
      iconBgColor: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      number: 3,
      title: 'Complete Onboarding',
      description: 'Set up your AI pricing assistant, customize your branding, and invite your team members to get the most out of TradeSphere.',
      icon: <Settings className="w-6 h-6" />,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      number: 4,
      title: 'Start Your 30-Day Trial',
      description: "Your trial period has started! Explore all premium features with no charges until your trial ends.",
      icon: <Clock className="w-6 h-6" />,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  interface InfoBox {
    title: string;
    value: string;
    description: string;
    gradient: string;
  }

  const keyInfo: InfoBox[] = [
    {
      title: 'Trial Period',
      value: '30 Days Free',
      description: 'Full access to all features',
      gradient: 'from-blue-600 to-blue-700',
    },
    {
      title: 'Micro-Deposits',
      value: '1-3 Business Days',
      description: 'Check your bank account',
      gradient: 'from-teal-600 to-teal-700',
    },
    {
      title: 'Next Billing Date',
      value: calculateTrialEndDate(),
      description: 'After trial ends',
      gradient: 'from-purple-600 to-purple-700',
    },
  ];

  return (
    <>
      {/* Header Component */}
      <Header />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-6 shadow-lg animate-bounce">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Registration Successful!
          </h1>

          <p className="text-xl sm:text-2xl text-gray-700 max-w-2xl mx-auto">
            Welcome to <span className="font-semibold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">TradeSphere</span>!
            Your 30-day free trial has started.
          </p>
        </div>

        {/* Key Information Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {keyInfo.map((info, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className={`h-2 bg-gradient-to-r ${info.gradient}`} />
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {info.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {info.value}
                </p>
                <p className="text-sm text-gray-600">
                  {info.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Next Steps Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
            Next Steps to Get Started
          </h2>

          <div className="space-y-6">
            {nextSteps.map((step, index) => (
              <div
                key={index}
                className="flex gap-4 sm:gap-6 p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full ${step.iconBgColor} ${step.iconColor} flex items-center justify-center`}>
                    {step.icon}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-teal-600 text-white text-sm font-bold">
                      {step.number}
                    </span>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={handleOpenEmail}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg shadow-lg hover:from-blue-700 hover:to-teal-700 transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <Mail className="w-5 h-5 mr-2" />
            Check Email
          </button>

          <button
            onClick={handleContactSupport}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg shadow-md hover:bg-gray-50 hover:border-gray-400 transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            Contact Support
          </button>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Need Help Getting Started?
            </h3>
            <p className="text-gray-600">
              Our support team is here to help you every step of the way
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <a
              href="mailto:support@tradesphere.com"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Email Support</h4>
              <p className="text-sm text-gray-600 text-center">support@tradesphere.com</p>
            </a>

            <a
              href="tel:+1-800-TRADE-SP"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-200 transition-colors">
                <Phone className="w-6 h-6 text-teal-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Phone Support</h4>
              <p className="text-sm text-gray-600 text-center">1-800-TRADE-SP</p>
            </a>

            <a
              href="/help"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Help Center</h4>
              <p className="text-sm text-gray-600 text-center">Documentation & Guides</p>
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Questions about billing or your trial? Check out our{' '}
            <a href="/faq" className="text-blue-600 hover:text-blue-700 font-medium underline">
              FAQ
            </a>
            {' '}or contact support.
          </p>
        </div>
        </div>
      </div>

      {/* Footer Component */}
      <Footer />
    </>
  );
};

export default RegistrationSuccess;
