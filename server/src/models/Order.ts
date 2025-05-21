import mongoose from 'mongoose';

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
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['created', 'paid', 'failed'],
    default: 'created'
  },
  paymentId: {
    type: String
  },
  notes: {
    organizationName: String,
    cause: String,
    quantity: Number
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

export const Order = mongoose.model('Order', orderSchema);
