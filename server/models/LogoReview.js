const mongoose = require('mongoose');
const { Schema } = mongoose;

const LogoReviewSchema = new Schema({
  campaignId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Campaign', 
    required: true, 
    index: true 
  },
  sponsorId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  originalUrl: String,
  correctedUrl: String,
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'], 
    default: 'PENDING' 
  },
  checks: {
    dpi: Number,
    format: String,
    mode: String,
    transparency: Boolean,
    palette: [String],
    contrastRatios: Schema.Types.Mixed
  },
  comments: [{
    by: String,
    text: String,
    at: { type: Date, default: Date.now },
    screenshotUrl: String
  }],
  versionHistory: [{
    url: String,
    at: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true 
});

// Create indexes for better query performance
LogoReviewSchema.index({ status: 1 });
LogoReviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LogoReview', LogoReviewSchema);
