import React from 'react';
import { Users, Award, Target, Zap } from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: Target,
      title: 'Customer-First',
      description: 'Every feature we build is designed to solve real problems faced by field service companies.'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'We leverage cutting-edge AI and automation to keep our customers ahead of the competition.'
    },
    {
      icon: Users,
      title: 'Partnership',
      description: 'We see ourselves as partners in your success, not just a software vendor.'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'We maintain the highest standards in security, reliability, and customer support.'
    }
  ];

  const team = [
    {
      name: 'Alex Chen',
      title: 'CEO & Co-Founder',
      image: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop&crop=face',
      bio: 'Former field service operations manager with 15+ years experience'
    },
    {
      name: 'Sarah Martinez',
      title: 'CTO & Co-Founder',
      image: 'https://images.pexels.com/photos/3184287/pexels-photo-3184287.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop&crop=face',
      bio: 'AI and machine learning expert, former Google engineer'
    },
    {
      name: 'Mike Thompson',
      title: 'VP of Customer Success',
      image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop&crop=face',
      bio: 'Dedicated to ensuring every customer achieves their goals'
    }
  ];

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            About Trade-Sphere
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're on a mission to empower field service companies with the tools and insights 
            they need to operate efficiently and grow sustainably.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Story</h3>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Trade-Sphere was founded in 2020 by field service veterans who experienced firsthand 
                the challenges of managing crews, scheduling jobs, and keeping customers happy with 
                outdated tools and manual processes.
              </p>
              <p>
                After running a successful HVAC company for over a decade, our founders realized that 
                most CRM solutions were built for sales teams, not service companies. They needed 
                something different—software that understood the unique challenges of field work.
              </p>
              <p>
                Today, Trade-Sphere serves over 500 field service companies across North America, 
                helping them save time, reduce costs, and deliver exceptional customer experiences.
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl p-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">By the Numbers</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-2xl font-bold text-blue-600">500+</div>
                <div className="text-sm text-gray-600">Companies Served</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">5M+</div>
                <div className="text-sm text-gray-600">Jobs Managed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">98%</div>
                <div className="text-sm text-gray-600">Customer Satisfaction</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-sm text-gray-600">Support Available</div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">Our Values</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl flex items-center justify-center">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Section */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">Meet Our Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 mx-auto rounded-full object-cover mb-4"
                />
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h4>
                <div className="text-blue-600 font-medium mb-2">{member.title}</div>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto leading-relaxed">
              To empower field service companies with intelligent, intuitive software that eliminates 
              administrative burden and enables them to focus on what they do best—delivering 
              exceptional service to their customers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;