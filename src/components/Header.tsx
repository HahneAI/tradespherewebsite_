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
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/image_2025-06-18_211614282.png" 
              alt="Trade-Sphere Logo" 
              className="h-10 w-10"
            />
            <span className="text-xl font-bold text-gray-900">Trade-Sphere</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {location.pathname === '/' ? (
              <>
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Pricing
                </button>
                <button
                  onClick={() => scrollToSection('about')}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  About
                </button>
              </>
            ) : (
              <button
                onClick={() => handleNavigation('/')}
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Home
              </button>
            )}
            <button
              onClick={() => handleNavigation('/onboarding')}
              className={`transition-colors font-medium ${
                location.pathname === '/onboarding'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Onboarding
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => scrollToSection('contact')}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Request Demo
            </button>
            <button
              onClick={() => handleNavigation('/onboarding')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Free Trial
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
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
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors text-left"
                >
                  Request Demo
                </button>
                <button
                  onClick={() => handleNavigation('/onboarding')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
                >
                  Start Free Trial
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