import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200/50 z-50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 group cursor-pointer">
            <img
              src="/image_2025-06-18_211614282.png"
              alt="Trade-Sphere Logo"
              className="h-10 w-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            />
            <span className="text-xl font-bold text-gray-900 transition-all duration-300 group-hover:text-blue-600">Trade-Sphere</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {location.pathname === '/' ? (
              <>
                <button
                  onClick={() => scrollToSection('features')}
                  className="relative text-gray-600 hover:text-blue-600 transition-colors duration-300 group"
                >
                  Features
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="relative text-gray-600 hover:text-blue-600 transition-colors duration-300 group"
                >
                  How It Works
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="relative text-gray-600 hover:text-blue-600 transition-colors duration-300 group"
                >
                  Pricing
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                </button>
                <button
                  onClick={() => scrollToSection('about')}
                  className="relative text-gray-600 hover:text-blue-600 transition-colors duration-300 group"
                >
                  About
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleNavigation('/')}
                className="relative text-gray-600 hover:text-blue-600 transition-colors duration-300 group"
              >
                Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </button>
            )}
            <button
              onClick={() => handleNavigation('/onboarding')}
              className={`relative transition-colors duration-300 font-medium group ${
                location.pathname === '/onboarding'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Onboarding
              <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${
                location.pathname === '/onboarding' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => scrollToSection('contact')}
              className="relative text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 hover:scale-105 px-6 py-2"
            >
              Request Demo
            </button>
            <button
              onClick={() => handleNavigation('/onboarding')}
              className="relative bg-blue-600 text-white px-6 py-2 rounded-lg font-medium overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105"
            >
              <span className="relative z-10">Book a Demo</span>
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 hover:scale-110"
          >
            {isMenuOpen ? <X className="h-6 w-6 transition-transform duration-300" /> : <Menu className="h-6 w-6 transition-transform duration-300" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 animate-slide-down">
            <div className="flex flex-col space-y-4">
              {location.pathname === '/' ? (
                <>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                  >
                    Features
                  </button>
                  <button
                    onClick={() => scrollToSection('how-it-works')}
                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                  >
                    How It Works
                  </button>
                  <button
                    onClick={() => scrollToSection('pricing')}
                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                  >
                    Pricing
                  </button>
                  <button
                    onClick={() => scrollToSection('about')}
                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                  >
                    About
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleNavigation('/')}
                  className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                >
                  Home
                </button>
              )}
              <button
                onClick={() => handleNavigation('/onboarding')}
                className={`transition-colors text-left font-medium ${
                  location.pathname === '/onboarding'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Onboarding
              </button>
              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => scrollToSection('contact')}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 text-left hover:translate-x-1"
                >
                  Request Demo
                </button>
                <button
                  onClick={() => handleNavigation('/onboarding')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 font-medium text-center hover:scale-105"
                >
                  Book a Demo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;