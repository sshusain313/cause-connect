const mongoose = require('mongoose');
const User = require('../models/User');
const Cause = require('../models/Cause');
const ToteClaim = require('../models/ToteClaim');
const Waitlist = require('../models/Waitlist');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for fetching data'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Fetch all data
const fetchAllData = async () => {
  try {
    // Fetch users
    const users = await User.find({}).select('-refreshToken -otp');
    console.log('\n=== USERS ===');
    console.log(`Total users: ${users.length}`);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}, role: ${user.role})`);
    });

    // Fetch causes
    const causes = await Cause.find({});
    console.log('\n=== CAUSES ===');
    console.log(`Total causes: ${causes.length}`);
    causes.forEach(cause => {
      console.log(`- ${cause.title} (${cause.category})`);
      console.log(`  Status: ${cause.status}, Online: ${cause.isOnline ? 'Yes' : 'No'}`);
      console.log(`  Goal: $${cause.goal}, Raised: $${cause.raised}`);
      console.log(`  Sponsors: ${cause.sponsors.length}`);
    });

    // Fetch claims
    const claims = await ToteClaim.find({}).populate('causeId', 'title');
    console.log('\n=== CLAIMS ===');
    console.log(`Total claims: ${claims.length}`);
    claims.forEach(claim => {
      console.log(`- Claim by ${claim.fullName} for cause: ${claim.causeId.title}`);
      console.log(`  Shipping to: ${claim.shippingAddress.address}, ${claim.shippingAddress.city}, ${claim.shippingAddress.state}`);
      console.log(`  Status: ${claim.status}`);
    });

    // Fetch waitlist entries
    const waitlistEntries = await Waitlist.find({}).populate('causeId', 'title');
    console.log('\n=== WAITLIST ENTRIES ===');
    console.log(`Total waitlist entries: ${waitlistEntries.length}`);
    waitlistEntries.forEach(entry => {
      console.log(`- ${entry.fullName} is waiting for: ${entry.causeId.title}`);
      console.log(`  Position: ${entry.position}, Status: ${entry.status}`);
      console.log(`  Notification preferences: Email: ${entry.notifyEmail ? 'Yes' : 'No'}, SMS: ${entry.notifySms ? 'Yes' : 'No'}`);
    });

    console.log('\nData fetch completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }
};

// Run the fetch function
fetchAllData();
