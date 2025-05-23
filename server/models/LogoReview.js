const mongoose = require('mongoose');

const logoCheckSchema = new mongoose.Schema({
  name: { type: String, required: true },
  passed: { type: Boolean, default: false },
  message: { type: String, required: true }
});

const logoCommentSchema = new mongoose.Schema({
  by: { type: String, required: true },
  text: { type: String, required: true },
  screenshot: { type: String },
  at: { type: Date, default: Date.now }
});

const logoReviewSchema = new mongoose.Schema({
  campaignId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Campaign',
    required: true 
  },
  sponsorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Sponsor',
    required: true 
  },
  originalUrl: { type: String, required: true },
  correctedUrl: { type: String },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'],
    default: 'PENDING'
  },
  checks: [logoCheckSchema],
  comments: [logoCommentSchema],
  palette: [{ type: String }],
  totePreview: {
    logoSize: { type: Number, default: 20 },
    logoPosition: {
      x: { type: Number, default: 50 },
      y: { type: Number, default: 75 }
    },
    previewImageUrl: { type: String },
    updatedAt: { type: Date, default: Date.now }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Pre-save middleware to update the updatedAt field
logoReviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('LogoReview', logoReviewSchema);
