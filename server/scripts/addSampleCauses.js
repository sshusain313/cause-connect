require('dotenv').config();
const mongoose = require('mongoose');
const Cause = require('../models/Cause');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const addSampleCauses = async () => {
  try {
    // Find an admin user to set as creator
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    // Sample causes to add
    const sampleCauses = [
      {
        title: 'Disaster Relief Fund',
        description: 'Supporting communities recovering from natural disasters.',
        story: 'Natural disasters can strike anywhere, anytime, leaving communities devastated. Our Disaster Relief Fund provides immediate assistance to affected areas, helping with food, shelter, medical supplies, and long-term rebuilding efforts.',
        impact: 'Your support helps us respond quickly to disasters worldwide, providing essential supplies and support to those who need it most.',
        timeline: 'Ongoing project with immediate deployment of resources when disasters occur.',
        imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        category: 'Humanitarian',
        goal: 25000,
        raised: 22000,
        status: 'sponsored',
        isOnline: true,
        createdBy: adminUser._id,
        sponsors: [
          {
            userId: adminUser._id,
            name: 'Global Relief Foundation',
            amount: 22000,
            createdAt: new Date()
          }
        ]
      },
      {
        title: 'Women Entrepreneurs',
        description: 'Empowering women with resources to start their own businesses.',
        story: 'Women entrepreneurs face unique challenges in accessing capital, networks, and resources. This initiative provides training, mentorship, and seed funding to women starting businesses in underserved communities.',
        impact: 'By supporting women entrepreneurs, we create sustainable economic opportunities that benefit entire communities and promote gender equality.',
        timeline: 'Six-month intensive training program followed by ongoing mentorship and support.',
        imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        category: 'Economic Development',
        goal: 10000,
        raised: 6300,
        status: 'waitlist',
        isOnline: true,
        createdBy: adminUser._id,
        sponsors: [
          {
            userId: adminUser._id,
            name: 'Women in Business Alliance',
            amount: 6300,
            createdAt: new Date()
          }
        ]
      }
    ];

    // Insert the causes
    const result = await Cause.insertMany(sampleCauses);
    console.log(`Successfully added ${result.length} sample causes to the database.`);
    console.log('Cause IDs:');
    result.forEach(cause => console.log(`- ${cause.title}: ${cause._id}`));

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample causes:', error);
    process.exit(1);
  }
};

// Run the function
addSampleCauses();
