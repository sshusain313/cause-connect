const User = require('../models/User');

// Seed admin user on startup
const seedAdmin = async () => {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!adminExists) {
      console.log('Creating admin user...');
      
      // Create new admin user
      const admin = new User({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Generate OTP for admin (using the password as OTP)
      const otp = admin.generateOTP();
      admin.otp.code = process.env.ADMIN_PASSWORD;
      
      await admin.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

module.exports = { seedAdmin };
