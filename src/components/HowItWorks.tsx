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
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Get Started in 4 Simple Steps
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From setup to scale, we've streamlined the process to get your field service 
            operations running efficiently as quickly as possible.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent transform translate-x-4"></div>
                )}
                
                <div className="text-center">
                  {/* Step Number */}
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm mb-4">
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center mb-6 hover:scale-110 transition-transform`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
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
        <div className="text-center mt-16">
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
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Schedule Your Demo
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;