require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Cause = require('../models/Cause');
const Campaign = require('../models/Campaign');
const Claim = require('../models/Claim');
const ToteClaim = require('../models/ToteClaim');
const { ObjectId } = mongoose.Types;

// MongoDB connection string from memory
const MONGODB_URI = 'mongodb+srv://shabahatsyed101:8flCr5MKAfy15JpW@cluster0.w8cgqlr.mongodb.net/';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function seedClaims() {
  try {
    // First check if we have any users, causes, and campaigns
    const adminUser = await User.findOne({ email: 'admin@cause.com' });
    if (!adminUser) {
      console.log('Admin user not found. Creating admin user...');
      const newAdmin = new User({
        name: 'Admin User',
        email: 'admin@cause.com',
        role: 'admin'
      });
      await newAdmin.save();
      console.log('Admin user created');
    }

    // Create a test cause if none exists
    let testCause = await Cause.findOne();
    if (!testCause) {
      console.log('No causes found. Creating a test cause...');
      testCause = new Cause({
        title: 'Test Cause',
        description: 'A test cause for development',
        story: 'This is a test cause created for development purposes.',
        imageUrl: 'https://via.placeholder.com/500',
        category: 'Education',
        goal: 10000,
        raised: 5000,
        status: 'open',
        isOnline: true
      });
      await testCause.save();
      console.log('Test cause created');
    }

    // Clear existing claims
    await Claim.deleteMany({});
    await ToteClaim.deleteMany({});
    console.log('Existing claims deleted');

    // Create a test campaign if none exists
    let testCampaign = await Campaign.findOne();
    if (!testCampaign) {
      console.log('No campaigns found. Creating a test campaign...');
      testCampaign = new Campaign({
        causeId: testCause._id,
        sponsorId: adminUser ? adminUser._id : mongoose.Types.ObjectId(),
        title: 'Test Campaign',
        description: 'A test campaign for development',
        category: 'Education',
        logo: 'https://via.placeholder.com/200',
        companyName: 'Test Company',
        toteQty: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        status: 'SPONSORED'
      });
      await testCampaign.save();
      console.log('Test campaign created');
    }

    // Check if we already have claims
    const existingClaimsCount = await Claim.countDocuments();
    if (existingClaimsCount > 0) {
      console.log(`${existingClaimsCount} claims already exist. Skipping claim creation.`);
    } else {
      // Create some test claims
      const claims = [];
      const toteClaims = [];
      const statuses = ['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERED'];
      const toteStatuses = ['pending', 'verified', 'processing', 'shipped', 'delivered'];
      const users = await User.find().limit(5);
      
      // If we don't have enough users, create some
      if (users.length < 5) {
        console.log('Creating additional test users...');
        for (let i = users.length; i < 5; i++) {
          const newUser = new User({
            name: `Test User ${i+1}`,
            email: `testuser${i+1}@example.com`,
            role: 'claimer'
          });
          await newUser.save();
          users.push(newUser);
        }
      }

      console.log('Creating test claims...');
      
      // Create regular claims (for backward compatibility)
      for (let i = 0; i < 5; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const cause = testCause;
        const campaign = testCampaign;
        const user = users[Math.floor(Math.random() * users.length)];
        
        if (campaign) {
          const claim = new Claim({
            campaignId: campaign._id,
            causeId: cause._id,
            userId: user._id,
            status,
            shippingAddress: {
              street: `${i+1} Test Street`,
              city: 'Test City',
              state: 'Test State',
              country: 'Test Country',
              postalCode: `1000${i}`
            },
            notes: [{
              text: `This is a test note for claim ${i+1}`,
              by: adminUser ? adminUser._id : users[0]._id,
              at: new Date()
            }]
          });
          
          // Add tracking info for shipped/delivered claims
          if (status === 'SHIPPED' || status === 'DELIVERED') {
            claim.trackingNumber = `TRK${100000 + i}`;
            claim.trackingUrl = `https://example.com/track/${100000 + i}`;
          }
          
          claims.push(claim);
        }
      }
      
      // Create tote claims (these will show up in the ClaimerDashboard)
      for (let i = 0; i < 10; i++) {
        const status = toteStatuses[Math.floor(Math.random() * toteStatuses.length)];
        const cause = testCause;
        const user = users[Math.floor(Math.random() * users.length)];
        
        const toteClaim = new ToteClaim({
          causeId: cause._id,
          causeTitle: cause.title,
          userId: user._id,
          fullName: user.name,
          email: user.email,
          phone: `555-123-${1000 + i}`,
          organization: `Organization ${i+1}`,
          address: `${i+1} Test Street`,
          city: 'Test City',
          state: 'Test State',
          zipCode: `1000${i}`,
          status,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          fromWaitlist: Math.random() > 0.7, // 30% chance of being from waitlist
          statusHistory: [{
            status,
            date: new Date(),
            note: `Initial status: ${status}`
          }],
          notes: [{
            text: `This is a test note for tote claim ${i+1}`,
            by: adminUser ? adminUser._id : users[0]._id,
            at: new Date()
          }]
        });
        
        // Add tracking info for shipped/delivered claims
        if (status === 'shipped' || status === 'delivered') {
          toteClaim.trackingNumber = `TRK${200000 + i}`;
          toteClaim.trackingUrl = `https://track.causebag.com/${200000 + i}`;
        }
        
        toteClaims.push(toteClaim);
      }
      
      if (claims.length > 0) {
        await Claim.insertMany(claims);
        console.log(`${claims.length} test regular claims created successfully!`);
      }
      
      await ToteClaim.insertMany(toteClaims);
      console.log(`${toteClaims.length} test tote claims created successfully!`);
    }

    console.log('Database seeding completed!');
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

seedClaims();
