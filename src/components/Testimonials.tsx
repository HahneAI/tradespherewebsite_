import React from 'react';
import { Star, Quote } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      title: 'Operations Manager',
      company: 'GreenScape Landscaping',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
      quote: "Trade-Sphere transformed our scheduling process. We've reduced administrative time by 60% and our customer satisfaction scores have never been higher.",
      rating: 5
    },
    {
      name: 'Mike Rodriguez',
      title: 'Owner',
      company: 'Rodriguez HVAC Services',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
      quote: "The AI-powered quoting feature alone has increased our quote-to-close rate by 35%. This software pays for itself.",
      rating: 5
    },
    {
      name: 'Emily Chen',
      title: 'General Manager',
      company: 'ProBuild Construction',
      image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
      quote: "Finally, a CRM built specifically for field service companies. The mobile app is intuitive and our crews love using it.",
      rating: 5
    }
  ];

  const stats = [
    { value: '500+', label: 'Companies Trust Us' },
    { value: '98%', label: 'Customer Satisfaction' },
    { value: '45%', label: 'Efficiency Increase' },
    { value: '24/7', label: 'Support Available' }
  ];

  return (
    <section className="relative py-20 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/3 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 animate-fade-in-up">
            Trusted by Field Service Leaders
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-fade-in-up delay-100">
            See how companies like yours are transforming their operations and growing their business with Trade-Sphere.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl hover:border-blue-300/50 transition-all duration-500 relative hover:-translate-y-2 animate-fade-in-up"
              style={{ animationDelay: `${index * 100 + 200}ms` }}
            >
              <Quote className="absolute top-4 right-4 h-6 w-6 text-blue-200 group-hover:text-blue-400 group-hover:scale-125 transition-all duration-300" />

              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current group-hover:scale-110 transition-transform duration-300" style={{ transitionDelay: `${i * 50}ms` }} />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 mb-6 leading-relaxed group-hover:text-gray-900 transition-colors duration-300">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover mr-4 group-hover:scale-110 group-hover:ring-2 group-hover:ring-blue-400 transition-all duration-300"
                />
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.title}</div>
                  <div className="text-sm text-blue-600 font-medium">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-teal-600 rounded-2xl p-8 text-white overflow-hidden group animate-fade-in-up delay-500 bg-200 animate-gradient">
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </div>

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group/stat">
                <div className="text-3xl md:text-4xl font-bold mb-2 group-hover/stat:scale-110 transition-transform duration-300">{stat.value}</div>
                <div className="text-blue-100 text-sm md:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Case Study CTA */}
        <div className="text-center mt-16">
          <div className="relative bg-gray-50 rounded-2xl p-8 overflow-hidden group hover:shadow-lg transition-all duration-300">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-teal-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Want to See Real Results?
              </h3>
              <p className="text-gray-600 mb-6">
                Download our case study to see how Rodriguez HVAC increased revenue by $50K in their first year.
              </p>
              <button className="relative bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold overflow-hidden group/btn transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105">
                <span className="relative z-10">Download Case Study</span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;