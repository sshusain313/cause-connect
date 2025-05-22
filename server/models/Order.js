const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  receipt: {
    type: String
  },
  notes: {
    type: Object
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed'],
    default: 'created'
  },
  paymentId: {
    type: String
  },
  causeId: {
    type: Schema.Types.ObjectId,
    ref: 'Cause'
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  sponsorshipDetails: {
    organizationName: String,
    contactName: String,
    email: String,
    phone: String,
    selectedCause: String,
    toteQuantity: Number,
    logoUrl: String,
    message: String,
    totalAmount: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
