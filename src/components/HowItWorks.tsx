import React from 'react';
import { UserPlus, Settings, Rocket, TrendingUp } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      title: 'Quick Setup',
      description: 'Get started in minutes with our guided onboarding process. Import your existing data and customize your workspace.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Settings,
      title: 'Configure & Customize',
      description: 'Tailor Trade-Sphere to your business needs. Set up service types, pricing models, and team permissions.',
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: Rocket,
      title: 'Launch & Optimize',
      description: 'Start managing jobs, scheduling crews, and generating quotes. Our AI learns from your data to improve over time.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: TrendingUp,
      title: 'Scale & Grow',
      description: 'Use insights and analytics to identify growth opportunities and scale your operations efficiently.',
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <section id="how-it-works" className="relative py-20 bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 right-0 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 animate-fade-in-up">
            Get Started in 4 Simple Steps
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-fade-in-up delay-100">
            From setup to scale, we've streamlined the process to get your field service
            operations running efficiently as quickly as possible.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="relative group animate-fade-in-up" style={{ animationDelay: `${index * 100 + 200}ms` }}>
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-blue-400 via-teal-400 to-transparent transform translate-x-4 opacity-50"></div>
                )}

                <div className="text-center">
                  {/* Step Number */}
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm mb-4 group-hover:scale-125 group-hover:bg-blue-700 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center mb-6 shadow-lg transition-all duration-500 perspective-1000 group-hover:shadow-2xl group-hover:scale-110 group-hover:-rotate-6`}>
                    <IconComponent className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-300" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Alternative for Mobile */}
        <div className="lg:hidden mt-16">
          <div className="space-y-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${step.color} flex items-center justify-center`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 ml-13">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in-up delay-500">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-gray-600 mb-6">
            Our team will help you get up and running in no time.
          </p>
          <button
            onClick={() => {
              const element = document.getElementById('contact');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="relative bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105"
          >
            <span className="relative z-10">Schedule Your Demo</span>
            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;