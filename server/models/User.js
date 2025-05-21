const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['sponsor', 'claimer', 'admin', 'visitor'],
    default: 'visitor'
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  refreshToken: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate OTP
UserSchema.methods.generateOTP = function() {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration time (10 minutes)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  
  this.otp = {
    code: otp,
    expiresAt
  };
  
  return otp;
};

// Verify OTP
UserSchema.methods.verifyOTP = function(code) {
  if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
    return false;
  }
  
  const now = new Date();
  
  // Check if OTP has expired
  if (now > this.otp.expiresAt) {
    return false;
  }
  
  // Check if OTP matches
  return this.otp.code === code;
};

// Clear OTP after verification
UserSchema.methods.clearOTP = function() {
  this.otp = undefined;
};

module.exports = mongoose.model('User', UserSchema);
