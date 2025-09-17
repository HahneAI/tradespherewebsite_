import React from 'react';
import { Brain, Calendar, BarChart3, Smartphone, Clock, Users, DollarSign, Shield } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Quoting Engine',
      description: 'Generate accurate quotes instantly using machine learning algorithms trained on thousands of successful projects.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling & Crew Management',
      description: 'Optimize routes, manage crew availability, and reduce travel time with intelligent scheduling automation.',
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: BarChart3,
      title: 'Real-Time Business Intelligence',
      description: 'Track KPIs, monitor performance, and make data-driven decisions with comprehensive analytics dashboard.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Smartphone,
      title: 'Mobile-First CRM Experience',
      description: 'Access all features on-the-go with our native mobile app designed for field service professionals.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Clock,
      title: 'Time Tracking & Productivity',
      description: 'Monitor job progress, track billable hours, and improve team productivity with automated time logging.',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Users,
      title: 'Customer Relationship Management',
      description: 'Maintain detailed customer profiles, communication history, and service records in one centralized platform.',
      color: 'from-pink-500 to-pink-600'
    },
    {
      icon: DollarSign,
      title: 'Automated Invoicing & Payments',
      description: 'Generate professional invoices automatically and accept payments online with integrated payment processing.',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: Shield,
      title: 'Enterprise Security & Compliance',
      description: 'Bank-level security with SOC 2 compliance, data encryption, and role-based access controls.',
      color: 'from-red-500 to-red-600'
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Scale Your Business
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive field service management tools designed to streamline operations, 
            increase efficiency, and drive growth for service-based businesses.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Field Service Operations?
            </h3>
            <p className="text-gray-600 mb-6">
              Join hundreds of companies already using Trade-Sphere to streamline their operations.
            </p>
            <button
              onClick={() => {
                const element = document.getElementById('contact');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;