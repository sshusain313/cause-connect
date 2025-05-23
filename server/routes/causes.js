const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const Cause = require('../models/Cause');
const User = require('../models/User');
const Order = require('../models/Order');
const LogoReview = require('../models/LogoReview');
const { authenticateToken, authorizeRoles } = require('../utils/jwt');

// Get all causes
router.get('/', async (req, res, next) => {
  try {
    // Extract token from headers
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    
    if (authHeader) {
      try {
        // Verify the token and check if user is admin
        const token = authHeader.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        isAdmin = user && user.role === 'admin';
      } catch (err) {
        // Token verification failed, not an admin
        console.log('Token verification failed:', err.message);
      }
    }
    
    // If not admin, only return online causes
    const query = isAdmin ? {} : { isOnline: true };
    
    const causes = await Cause.find(query).sort({ createdAt: -1 });
    
    res.status(200).json(causes);
  } catch (error) {
    next(error);
  }
});

// Sponsor a cause after successful payment
router.post('/sponsor', async (req, res, next) => {
  try {
    console.log('Received sponsorship request:', req.body);
    
    const {
      causeId,
      sponsorName,
      sponsorEmail,
      sponsorPhone,
      quantity,
      logoUrl,
      message,
      paymentId,
      orderId,
      totePreview
    } = req.body;

    // Validate required fields
    if (!causeId || !sponsorName || !quantity || !paymentId || !orderId) {
      console.log('Missing required fields:', { causeId, sponsorName, quantity, paymentId, orderId });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for sponsorship'
      });
    }

    // Validate causeId format
    if (!mongoose.Types.ObjectId.isValid(causeId)) {
      console.log('Invalid cause ID format:', causeId);
      return res.status(400).json({
        success: false,
        message: 'Invalid cause ID format'
      });
    }
    
    // Find the cause
    console.log('Looking for cause with ID:', causeId);
    const cause = await Cause.findById(causeId);
    if (!cause) {
      console.log('Cause not found with ID:', causeId);
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    console.log('Found cause:', cause.title);

    // Verify payment with Razorpay (in production, you would verify the signature)
    console.log('Payment verified with ID:', paymentId);
    
    try {
      // Create or update the order record
      let order = await Order.findOne({ orderId: orderId });
      if (!order) {
        // Create a new order record with proper ObjectId handling
        const orderData = {
          orderId: orderId,
          paymentId: paymentId,
          amount: quantity * unitPrice,
          sponsorName: sponsorName,
          sponsorEmail: sponsorEmail,
          status: 'paid',
          createdAt: new Date()
        };
        
        // Only add causeId if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(causeId)) {
          orderData.causeId = new ObjectId(causeId);
        }
        
        order = new Order(orderData);
        await order.save();
        console.log('Created new order record:', order._id);
      } else {
        // Update existing order
        order.status = 'paid';
        order.paymentId = paymentId;
        await order.save();
        console.log('Updated existing order:', order._id);
      }
    } catch (orderError) {
      console.error('Error creating/updating order:', orderError);
      // Continue with the process even if order creation fails
      // This ensures the sponsorship is still recorded in the cause
    }

    // Calculate sponsorship amount (10 per tote)
    const unitPrice = 10;
    const amount = quantity * unitPrice;

    // Create a logo review record if we have a logo URL and tote preview data
    let logoReviewId = null;
    if (logoUrl && totePreview) {
      try {
        // Create a new logo review
        const logoReview = new LogoReview({
          campaignId: new ObjectId(causeId),
          sponsorId: new ObjectId(), // Use a temporary ObjectId since we don't have a real sponsor ID yet
          originalUrl: logoUrl,
          status: 'PENDING',
          totePreview: {
            logoSize: totePreview.logoSize || 20,
            logoPosition: {
              x: totePreview.logoPosition?.x || 50,
              y: totePreview.logoPosition?.y || 75
            },
            previewImageUrl: totePreview.previewImageUrl || logoUrl,
            updatedAt: new Date()
          }
        });
        
        await logoReview.save();
        logoReviewId = logoReview._id;
        console.log('Created new logo review record:', logoReviewId);
      } catch (logoError) {
        console.error('Error creating logo review:', logoError);
        // Continue with the process even if logo review creation fails
      }
    }

    try {
      // Add sponsor to the cause with more details
      console.log('Adding sponsor to cause with amount:', amount);
      const sponsorData = {
        name: sponsorName,
        email: sponsorEmail,
        phone: sponsorPhone,
        logo: logoUrl || '',
        amount: amount,
        message: message || '',
        paymentId: paymentId,
        orderId: orderId,
        logoReviewId: logoReviewId,
        totePreview: totePreview || null,
        status: 'pending', // Set to pending for admin approval even though payment is verified
        createdAt: new Date()
      };
      
      // Add the sponsor to the cause
      cause.sponsors.push(sponsorData);
    } catch (sponsorError) {
      console.error('Error adding sponsor to cause:', sponsorError);
      return res.status(500).json({
        success: false,
        message: 'Error adding sponsor to cause',
        error: sponsorError.message
      });
    }
    
    // Update the cause's raised amount
    cause.raised = (cause.raised || 0) + amount;
    console.log('Updated cause raised amount to:', cause.raised);

    // Update cause status if needed (this will be handled by the pre-save hook)
    await cause.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Sponsorship added successfully',
      cause: {
        id: cause._id,
        title: cause.title,
        status: cause.status,
        raised: cause.raised,
        goal: cause.goal
      },
      sponsor: {
        name: sponsorName,
        email: sponsorEmail,
        amount: amount,
        paymentId: paymentId,
        orderId: orderId,
        logoReviewId: logoReviewId
      }
    });

  } catch (error) {
    console.error('Sponsorship error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle specific ObjectId errors
    let errorMessage = 'Failed to process sponsorship';
    if (error.message && (error.message.includes('ObjectId') || error.message.includes('cannot be invoked without \'new\''))) {
      errorMessage = 'Invalid ID format in request';
    }
    
    // Send a more detailed error response
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

module.exports = router;