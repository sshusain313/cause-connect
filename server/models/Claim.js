const mongoose = require('mongoose');
const { Schema } = mongoose;

const ClaimSchema = new Schema({
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  causeId: {
    type: Schema.Types.ObjectId,
    ref: 'Cause',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'SHIPPED', 'DELIVERED'],
    default: 'PENDING',
    index: true
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  trackingNumber: String,
  trackingUrl: String,
  notes: [{
    text: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  proofOfImpact: {
    images: [String],
    description: String,
    submittedAt: Date
  }
}, {
  timestamps: true
});

// Add text index for search
ClaimSchema.index({
  '$**': 'text'
});

module.exports = mongoose.model('Claim', ClaimSchema);
