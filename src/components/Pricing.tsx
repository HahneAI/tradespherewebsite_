import React, { useState } from 'react';
import { Check, Star } from 'lucide-react';

const Pricing = () => {
  const [showComparison, setShowComparison] = useState(false);

  const plans = [
    {
      name: 'Starter',
      price: 'Contact Us',
      period: '',
      description: 'For small teams and solo operators',
      features: [
        'Up to 5 users',
        'AI-powered quoting engine',
        'Smart scheduling & mobile access',
        'Customer management',
        'Email + chat support',
        '5 quote analytics projects/month'
      ],
      popular: false,
      cta: 'Book a Demo',
      planParam: 'standard'
    },
    {
      name: 'Growth',
      price: 'Contact Us',
      period: '',
      description: 'For growing field teams and businesses',
      features: [
        'Includes all Starter features',
        'Up to 20 users',
        'Real-time crew tracking',
        'Route optimization',
        'Advanced reporting & dashboards',
        'Unlimited quote sessions',
        'Live support & onboarding help'
      ],
      popular: true,
      cta: 'Book a Demo',
      planParam: 'pro'
    },
    {
      name: 'Enterprise',
      price: 'Contact Us',
      period: '',
      description: 'For large or multi-location businesses',
      features: [
        'Includes all Growth features',
        'Unlimited users',
        'Branch/location management',
        'Dedicated account manager',
        'API & integrations',
        'White-labeled client portal',
        'Custom onboarding & priority support'
      ],
      popular: false,
      cta: 'Book a Demo',
      planParam: 'enterprise'
    }
  ];

  const allFeatures = [
    {
      category: 'Users & Access',
      features: [
        { name: 'Number of users', starter: 'Up to 5', growth: 'Up to 20', enterprise: 'Unlimited' },
        { name: 'Mobile access', starter: true, growth: true, enterprise: true },
        { name: 'Multi-location support', starter: false, growth: false, enterprise: true }
      ]
    },
    {
      category: 'Core Features',
      features: [
        { name: 'AI-powered quoting engine', starter: true, growth: true, enterprise: true },
        { name: 'Smart scheduling', starter: true, growth: true, enterprise: true },
        { name: 'Customer management', starter: true, growth: true, enterprise: true },
        { name: 'Real-time crew tracking', starter: false, growth: true, enterprise: true },
        { name: 'Route optimization', starter: false, growth: true, enterprise: true }
      ]
    },
    {
      category: 'Analytics & Reporting',
      features: [
        { name: 'Quote analytics projects', starter: '5/month', growth: 'Unlimited', enterprise: 'Unlimited' },
        { name: 'Advanced reporting & dashboards', starter: false, growth: true, enterprise: true },
        { name: 'Custom reporting', starter: false, growth: false, enterprise: true }
      ]
    },
    {
      category: 'Support & Services',
      features: [
        { name: 'Email + chat support', starter: true, growth: true, enterprise: true },
        { name: 'Live support & onboarding', starter: false, growth: true, enterprise: true },
        { name: 'Dedicated account manager', starter: false, growth: false, enterprise: true },
        { name: 'Priority support', starter: false, growth: false, enterprise: true }
      ]
    },
    {
      category: 'Advanced Features',
      features: [
        { name: 'API & integrations', starter: false, growth: false, enterprise: true },
        { name: 'White-labeled client portal', starter: false, growth: false, enterprise: true },
        { name: 'Custom onboarding', starter: false, growth: false, enterprise: true }
      ]
    }
  ];

  return (
    <section id="pricing" className="relative py-20 bg-gray-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-teal-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 animate-fade-in-up">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8 animate-fade-in-up delay-100">
            Choose the plan that fits your business size and needs. All plans include a 14-day free trial.
          </p>
          
          {/* Compare Plans Toggle */}
          <div className="inline-flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700 mb-8 animate-fade-in-up delay-200">
            <button
              onClick={() => setShowComparison(false)}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-300 ${
                !showComparison
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              View Plans
            </button>
            <button
              onClick={() => setShowComparison(true)}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-300 ${
                showComparison
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              Compare Plans
            </button>
          </div>
        </div>

        {!showComparison ? (
          /* Pricing Cards */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-gray-800 rounded-2xl p-8 overflow-hidden group animate-fade-in-up ${
                  plan.popular
                    ? 'border-2 border-blue-500 shadow-2xl shadow-blue-500/20 scale-105 hover:scale-110'
                    : 'border border-gray-700 shadow-xl hover:border-blue-400/50'
                } hover:shadow-2xl transition-all duration-500`}
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1 shadow-lg animate-bounce-subtle">
                      <Star className="h-3 w-3 fill-current animate-pulse" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="relative text-center mb-8">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300">{plan.name}</h3>
                  <p className="text-gray-400 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white group-hover:scale-110 inline-block transition-transform duration-300">{plan.price}</span>
                    {plan.period && <span className="text-gray-400 ml-1">/{plan.period}</span>}
                  </div>
                  <button
                    className={`relative w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 overflow-hidden ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700 shadow-lg hover:shadow-xl hover:shadow-blue-500/50 hover:scale-105'
                        : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600 hover:border-blue-400 hover:scale-105'
                    }`}
                    onClick={() => {
                      window.location.href = `/signup?plan=${plan.planParam}`;
                    }}
                  >
                    <span className="relative z-10">{plan.cta}</span>
                  </button>
                </div>

                {/* Features */}
                <div className="relative space-y-4">
                  <div className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                    What's included:
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start group/feature">
                        <Check className="h-4 w-4 text-green-400 mr-3 flex-shrink-0 mt-0.5 group-hover/feature:scale-125 transition-transform duration-300" />
                        <span className="text-gray-300 group-hover/feature:text-white transition-colors duration-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Comparison Table */
          <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700 border-b border-gray-600">
                    <th className="text-left py-4 px-6 font-semibold text-white">Features</th>
                    <th className="text-center py-4 px-6 font-semibold text-white">
                      Starter
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-white relative">
                      Growth
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-2 py-1 rounded text-xs font-medium">
                          Most Popular
                        </div>
                      </div>
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-white">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((category, categoryIndex) => (
                    <React.Fragment key={categoryIndex}>
                      <tr className="bg-gray-750">
                        <td colSpan={4} className="py-3 px-6 font-semibold text-white text-sm uppercase tracking-wide bg-gray-700">
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature, featureIndex) => (
                        <tr key={featureIndex} className="border-b border-gray-700 hover:bg-gray-750">
                          <td className="py-4 px-6 text-gray-300">{feature.name}</td>
                          <td className="py-4 px-6 text-center">
                            {typeof feature.starter === 'boolean' ? (
                              feature.starter ? (
                                <Check className="h-5 w-5 text-green-400 mx-auto" />
                              ) : (
                                <span className="text-gray-500">—</span>
                              )
                            ) : (
                              <span className="text-gray-300">{feature.starter}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center bg-blue-900/20">
                            {typeof feature.growth === 'boolean' ? (
                              feature.growth ? (
                                <Check className="h-5 w-5 text-green-400 mx-auto" />
                              ) : (
                                <span className="text-gray-500">—</span>
                              )
                            ) : (
                              <span className="text-gray-300">{feature.growth}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {typeof feature.enterprise === 'boolean' ? (
                              feature.enterprise ? (
                                <Check className="h-5 w-5 text-green-400 mx-auto" />
                              ) : (
                                <span className="text-gray-500">—</span>
                              )
                            ) : (
                              <span className="text-gray-300">{feature.enterprise}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* CTA Row */}
            <div className="bg-gray-700 px-6 py-6">
              <div className="grid grid-cols-4 gap-4">
                <div></div>
                <button
                  onClick={() => {
                    window.location.href = '/signup?plan=standard';
                  }}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors font-semibold text-sm border border-gray-500"
                >
                  Book a Demo
                </button>
                <button
                  onClick={() => {
                    window.location.href = '/signup?plan=pro';
                  }}
                  className="bg-gradient-to-r from-blue-600 to-teal-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all font-semibold text-sm shadow-lg"
                >
                  Book a Demo
                </button>
                <button
                  onClick={() => {
                    window.location.href = '/signup?plan=enterprise';
                  }}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors font-semibold text-sm border border-gray-500"
                >
                  Book a Demo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 text-center animate-fade-in-up delay-500">
          <h3 className="text-2xl font-bold text-white mb-8">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1">
              <h4 className="font-semibold text-white mb-2">
                Is there a setup fee?
              </h4>
              <p className="text-gray-400">
                No setup fees. We include onboarding and training with all plans.
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1">
              <h4 className="font-semibold text-white mb-2">
                What payment methods do you accept?
              </h4>
              <p className="text-gray-400">
                We use secure ACH bank transfers for seamless, hassle-free payments directly from your business account. No credit card fees, no payment processing delays—just simple, reliable billing that works for your business.
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1">
              <h4 className="font-semibold text-white mb-2">
                Do you offer a money-back guarantee?
              </h4>
              <p className="text-gray-400">
                Absolutely! We offer a 30-day money-back guarantee. If you're not completely satisfied with Tradesphere, we'll refund your payment—no questions asked.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-teal-600 rounded-2xl p-8 text-white overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-500 bg-200 animate-gradient">
            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>

            <div className="relative">
              <h3 className="text-2xl font-bold mb-4">
                Ready to Transform Your Field Service Operations?
              </h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Join hundreds of companies already using Trade-Sphere to streamline their operations and grow their business.
              </p>
              <button
                onClick={() => {
                  window.location.href = '/signup';
                }}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition-all duration-300 font-semibold shadow-lg hover:shadow-2xl transform hover:scale-110"
              >
                Get Started Today
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;