import React from 'react';
import { ArrowRight, Play } from 'lucide-react';

const Hero = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="pt-20 pb-16 lg:pb-20 bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-8">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
            Now powered by AI
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            The Future of{' '}
            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Field Service
            </span>{' '}
            CRM
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed">
            Streamline your operations with AI-powered quoting, smart scheduling, and real-time insights. 
            Built specifically for landscaping, HVAC, construction, and home service companies.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => scrollToSection('contact')}
              className="group bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-all font-semibold text-lg flex items-center justify-center space-x-2 hover:scale-105 transform"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="group border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all font-semibold text-lg flex items-center justify-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Request Demo</span>
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-6">Trusted by 500+ field service companies</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-gray-400 font-semibold">ServicePro</div>
              <div className="text-gray-400 font-semibold">GreenTech Solutions</div>
              <div className="text-gray-400 font-semibold">HVAC Masters</div>
              <div className="text-gray-400 font-semibold">BuildRight</div>
            </div>
          </div>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <div className="mt-16 relative">
          <div className="bg-white rounded-2xl shadow-2xl p-1 mx-auto max-w-5xl">
            <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-xl p-8 text-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">98%</div>
                  <div className="text-blue-100">Customer Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">45%</div>
                  <div className="text-blue-100">Faster Scheduling</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">$50K+</div>
                  <div className="text-blue-100">Average Revenue Increase</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;