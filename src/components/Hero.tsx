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
    <section className="relative pt-20 pb-16 lg:pb-20 bg-gradient-to-br from-blue-50 via-white to-teal-50 overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100/80 backdrop-blur-sm text-blue-800 mb-8 animate-fade-in-down border border-blue-200">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
            Now powered by AI
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up">
            The Future of{' '}
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-600 bg-clip-text text-transparent bg-200 animate-gradient">
              Field Service
            </span>{' '}
            CRM
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed animate-fade-in-up delay-100">
            Streamline your operations with AI-powered quoting, smart scheduling, and real-time insights.
            Built specifically for landscaping, HVAC, construction, and home service companies.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up delay-200">
            <button
              onClick={() => scrollToSection('contact')}
              className="group relative bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center justify-center space-x-2 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(37,99,235,0.5)]"
            >
              <span className="relative z-10">Book a Demo</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform relative z-10" />
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="group relative border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg flex items-center justify-center space-x-2 transition-all duration-300 hover:scale-105 hover:border-blue-600 hover:text-blue-600 hover:shadow-lg"
            >
              <Play className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>Request Demo</span>
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="text-center animate-fade-in-up delay-300">
            <p className="text-gray-500 text-sm mb-6">Trusted by 500+ field service companies</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-gray-400 font-semibold hover:text-gray-600 hover:scale-110 transition-all duration-300 cursor-default">ServicePro</div>
              <div className="text-gray-400 font-semibold hover:text-gray-600 hover:scale-110 transition-all duration-300 cursor-default">GreenTech Solutions</div>
              <div className="text-gray-400 font-semibold hover:text-gray-600 hover:scale-110 transition-all duration-300 cursor-default">HVAC Masters</div>
              <div className="text-gray-400 font-semibold hover:text-gray-600 hover:scale-110 transition-all duration-300 cursor-default">BuildRight</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Hero;