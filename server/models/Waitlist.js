const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema({
  causeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cause',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  organization: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    trim: true
  },
  notifyEmail: {
    type: Boolean,
    default: true
  },
  notifySms: {
    type: Boolean,
    default: false
  },
  position: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'notified', 'claimed', 'expired'],
    default: 'waiting'
  },
  magicLinkToken: String,
  magicLinkSentAt: Date,
  magicLinkExpires: Date,
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
WaitlistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate magic link token
WaitlistSchema.methods.generateMagicLink = function() {
  // Generate a random token
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15) +
                Date.now().toString(36);
  
  // Set expiration time (48 hours)
  const expires = new Date();
  expires.setHours(expires.getHours() + 48);
  
  this.magicLinkToken = token;
  this.magicLinkSentAt = new Date();
  this.magicLinkExpires = expires;
  this.status = 'notified';
  
  return token;
};

// Verify magic link token
WaitlistSchema.methods.verifyMagicLink = function(token) {
  if (!this.magicLinkToken || !this.magicLinkExpires) {
    return false;
  }
  
  const now = new Date();
  
  // Check if token has expired
  if (now > this.magicLinkExpires) {
    return false;
  }
  
  // Check if token matches
  return this.magicLinkToken === token;
};

module.exports = mongoose.model('Waitlist', WaitlistSchema);
