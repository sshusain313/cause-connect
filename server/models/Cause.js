const mongoose = require('mongoose');

const SponsorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  logo: String,
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CauseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  story: {
    type: String,
    required: [true, 'Story is required'],
    trim: true
  },
  impact: {
    type: String,
    trim: true
  },
  timeline: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  goal: {
    type: Number,
    required: [true, 'Goal amount is required'],
    min: 0
  },
  raised: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'open', 'sponsored', 'waitlist', 'completed', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  creatorName: {
    type: String,
    default: ''
  },
  creatorEmail: {
    type: String,
    default: ''
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sponsors: [SponsorSchema],
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
CauseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total raised amount from sponsors
  if (this.sponsors && this.sponsors.length > 0) {
    this.raised = this.sponsors.reduce((total, sponsor) => total + sponsor.amount, 0);
  }
  
  // Update status based on raised amount
  if (this.raised >= this.goal) {
    this.status = 'sponsored';
  }
  
  next();
});

module.exports = mongoose.model('Cause', CauseSchema);
