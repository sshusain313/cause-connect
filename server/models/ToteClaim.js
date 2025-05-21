const mongoose = require('mongoose');

const ShippingAddressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  }
});

const ToteClaimSchema = new mongoose.Schema({
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
  // Direct address fields for easier access
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  // Legacy shippingAddress field for backward compatibility
  shippingAddress: {
    type: ShippingAddressSchema,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'processing', 'shipped', 'delivered'],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  trackingUrl: {
    type: String,
    trim: true
  },
  causeTitle: {
    type: String,
    trim: true
  },
  notes: [{
    text: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  proofOfImpact: {
    images: [String],
    description: String,
    submittedAt: Date
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  fromWaitlist: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'verified', 'processing', 'shipped', 'delivered']
    },
    date: {
      type: Date,
      default: Date.now
    },
    note: String
  }]
});

// Update the updatedAt timestamp before saving
ToteClaimSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Add status to history if it's changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      date: new Date(),
      note: `Status changed to ${this.status}`
    });
  }
  
  // If direct address fields are provided but shippingAddress is not,
  // populate the shippingAddress for backward compatibility
  if (this.address && this.city && this.state && this.zipCode && !this.shippingAddress) {
    this.shippingAddress = {
      address: this.address,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode
    };
  }
  
  next();
});

module.exports = mongoose.model('ToteClaim', ToteClaimSchema);
