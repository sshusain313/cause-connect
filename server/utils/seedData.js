const mongoose = require('mongoose');
const User = require('../models/User');
const Cause = require('../models/Cause');
const ToteClaim = require('../models/ToteClaim');
const Waitlist = require('../models/Waitlist');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for seeding data'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Sample data
const sampleUsers = [
  {
    name: 'Shabaht Husain',
    email: 'shabahatsyed101@gmail.com',
    role: 'sponsor',
  },
  {
    name: 'Shabahat Husain',
    email: 'shabahathusain313@gmail.com',
    role: 'claimer',
  },
  {
    name: 'Sam Visitor',
    email: 'visitor@example.com',
    role: 'visitor',
  }
];

const sampleCauses = [
  {
    title: 'Clean Water Initiative',
    description: 'Providing clean water to underserved communities.',
    story: 'Access to clean water is a fundamental human right, yet millions around the world still lack this basic necessity. Our initiative aims to install water purification systems in communities most affected by water scarcity and contamination.',
    imageUrl: 'https://images.unsplash.com/photo-1581985673473-0784a7a44e39?q=80&w=1000',
    category: 'Environment',
    goal: 5000,
    raised: 2500,
    status: 'open',
    isOnline: true,
  },
  {
    title: 'Children\'s Education Fund',
    description: 'Supporting education for underprivileged children.',
    story: 'Education is the most powerful tool we can use to change the world. This fund provides scholarships, learning materials, and infrastructure support to schools in underprivileged areas.',
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1022',
    category: 'Education',
    goal: 3000,
    raised: 3000,
    status: 'sponsored',
    isOnline: true,
  },
  {
    title: 'Food Security Project',
    description: 'Addressing food insecurity in urban areas.',
    story: 'In the midst of urban prosperity, many still go hungry. This project establishes community gardens, food banks, and educational programs to combat food insecurity in city neighborhoods.',
    imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1000',
    category: 'Food',
    goal: 4000,
    raised: 1500,
    status: 'open',
    isOnline: false,
  },
  {
    title: 'Wildlife Conservation',
    description: 'Protecting endangered species and their habitats.',
    story: 'The rapid loss of biodiversity threatens not just wildlife but the entire ecosystem. Our conservation efforts focus on habitat preservation, anti-poaching initiatives, and community education.',
    imageUrl: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=1172',
    category: 'Environment',
    goal: 6000,
    raised: 2500,
    status: 'waitlist',
    isOnline: true,
  },
  {
    title: 'Mental Health Support',
    description: 'Providing resources for mental health services in underserved areas.',
    story: 'Mental health care should be accessible to everyone. This cause funds counseling services, awareness programs, and training for mental health professionals in communities with limited resources.',
    imageUrl: 'https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?q=80&w=1170',
    category: 'Healthcare',
    goal: 4500,
    raised: 0,
    status: 'waitlist',
    isOnline: false,
  }
];

// Seed data function
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({ role: { $ne: 'admin' } }); // Keep admin user
    await Cause.deleteMany({});
    await ToteClaim.deleteMany({});
    await Waitlist.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Create users
    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`Created ${createdUsers.length} sample users`);
    
    // Create causes with sponsors
    const causesWithSponsors = sampleCauses.map(cause => {
      // Add a sponsor to some causes
      if (cause.raised > 0) {
        const sponsorUser = createdUsers.find(user => user.role === 'sponsor');
        cause.sponsors = [{
          userId: sponsorUser._id,
          name: sponsorUser.name,
          amount: cause.raised,
          createdAt: new Date()
        }];
      }
      return cause;
    });
    
    const createdCauses = await Cause.insertMany(causesWithSponsors);
    console.log(`Created ${createdCauses.length} sample causes`);
    
    // Create claims for sponsored causes
    const sponsoredCauses = createdCauses.filter(cause => cause.status === 'sponsored');
    const claimerUser = createdUsers.find(user => user.role === 'claimer');
    
    if (sponsoredCauses.length > 0 && claimerUser) {
      const sampleClaims = sponsoredCauses.map(cause => ({
        causeId: cause._id,
        userId: claimerUser._id,
        fullName: claimerUser.name,
        email: claimerUser.email,
        phone: '555-123-4567',
        organization: 'Community Outreach',
        shippingAddress: {
          address: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        status: 'pending',
        claimDate: new Date()
      }));
      
      const createdClaims = await ToteClaim.insertMany(sampleClaims);
      console.log(`Created ${createdClaims.length} sample claims`);
    }
    
    // Create waitlist entries for waitlist causes
    const waitlistCauses = createdCauses.filter(cause => cause.status === 'waitlist');
    const visitorUser = createdUsers.find(user => user.role === 'visitor');
    
    if (waitlistCauses.length > 0 && visitorUser) {
      const sampleWaitlist = waitlistCauses.map((cause, index) => ({
        causeId: cause._id,
        userId: visitorUser._id,
        fullName: visitorUser.name,
        email: visitorUser.email,
        phone: '555-987-6543',
        organization: 'Community Support Group',
        message: 'I would like to be notified when this cause is available.',
        notifyEmail: true,
        notifySms: false,
        position: index + 1,
        status: 'waiting'
      }));
      
      const createdWaitlist = await Waitlist.insertMany(sampleWaitlist);
      console.log(`Created ${createdWaitlist.length} sample waitlist entries`);
    }
    
    console.log('Sample data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

// Run the seed function
seedData();
