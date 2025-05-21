import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order } from '../models/Order';

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

// Create a new order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;

    const options = {
      amount,
      currency,
      receipt,
      notes
    };

    const order = await razorpay.orders.create(options);

    // Save order details to database
    await Order.create({
      orderId: order.id,
      amount: amount / 100, // Convert back to rupees
      currency,
      receipt,
      notes,
      status: 'created'
    });

    res.json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      message: 'Failed to create order',
      error: error.message 
    });
  }
});

// Verify payment
router.post('/verify', async (req, res) => {
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
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // Update order status
    await Order.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { 
        $set: {
          status: 'paid',
          paymentId: razorpay_payment_id,
          sponsorshipDetails
        }
      }
    );

    res.json({ 
      message: 'Payment verified successfully',
      orderId: razorpay_order_id
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      message: 'Payment verification failed',
      error: error.message 
    });
  }
});

export default router;
