const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
router.post('/create-order', async (req, res) => {
  console.log('Received create-order request:', {
    body: req.body,
    headers: req.headers
  });
  try {
    const { amount, currency, receipt, notes } = req.body;

    const options = {
      amount: amount,
      currency: currency || 'INR',
      receipt: receipt,
      notes: notes
    };

    console.log('Creating Razorpay order with options:', options);
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created:', order);
    
    // Save order to database
    await Order.create({
      orderId: order.id,
      amount: amount / 100, // Convert from paise to rupees
      currency: currency || 'INR',
      receipt: receipt,
      notes: notes,
      status: 'created'
    });

    res.json(order);
  } catch (error) {
    console.error('Order creation error:', {
      error: error,
      message: error.message,
      stack: error.stack
    });
    
    // Check if it's a Razorpay API error
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.error.description || 'Razorpay API error',
        error: error.error
      });
    }

    res.status(500).json({ 
      message: 'Failed to create order',
      error: error.message 
    });
  }
});

// Verify payment
router.post('/verify', async (req, res) => {
  console.log('Received verify payment request:', {
    body: req.body,
    headers: req.headers
  });
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      sponsorshipDetails
    } = req.body;

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update order status
    await Order.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { 
        $set: {
          status: 'paid',
          paymentId: razorpay_payment_id,
          sponsorshipDetails: sponsorshipDetails
        }
      }
    );

    res.json({ 
      message: 'Payment verified successfully',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      message: 'Payment verification failed',
      error: error.message 
    });
  }
});

module.exports = router;
