import React, { useState } from 'react';
import { User, Settings, Users, Globe, Monitor, Play, ArrowRight, Terminal } from 'lucide-react';

const OnboardingFlow = () => {
  const [currentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('ai-pricing');

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
            <button className="group bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-600 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center space-x-2">
              <Play className="h-5 w-5" />
              <span>Initialize Demo</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="group border-2 border-gray-600 text-gray-300 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-500 hover:text-white transition-all duration-200 hover:bg-gray-800/30 flex items-center space-x-2">
              <Terminal className="h-5 w-5" />
              <span>Begin Setup Process</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <p className="text-gray-500 mt-6 font-mono text-sm">
            // Continue to complete system initialization
          </p>
        </div>
      </main>
    </div>
  );
};

export default OnboardingFlow;