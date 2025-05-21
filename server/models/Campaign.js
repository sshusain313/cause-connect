const mongoose = require('mongoose');

const ModNoteSchema = new mongoose.Schema({
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  at: {
    type: Date,
    default: Date.now
  }
});

const CampaignSchema = new mongoose.Schema({
  causeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cause',
    required: true
  },
  sponsorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  toteQty: {
    type: Number,
    required: true,
    min: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  waitlistCleared: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['PENDING', 'CHANGES_REQUESTED', 'SPONSORED', 'REJECTED', 'COMPLETED'],
    default: 'PENDING'
  },
  rejectionReason: {
    type: String
  },
  modNotes: [ModNoteSchema],
  csrDocumentUrl: {
    type: String
  },
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
CampaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Campaign', CampaignSchema);
