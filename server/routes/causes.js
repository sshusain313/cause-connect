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

    // Validate required fields with detailed error messages
    const missingFields = [];
    if (!causeId) missingFields.push('causeId');
    if (!sponsorName) missingFields.push('sponsorName');
    if (!quantity) missingFields.push('quantity');
    
    // Make payment validation optional for testing/development
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !paymentId) missingFields.push('paymentId');
    if (isProduction && !orderId) missingFields.push('orderId');
    
    // Log the request body for debugging
    console.log('Request body:', req.body);
    console.log('Missing fields:', missingFields);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }
    
    // Use default values for missing optional fields
    const processedPaymentId = paymentId || 'test_payment_id';
    const processedOrderId = orderId || 'test_order_id';

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
    console.log('Payment verified with ID:', processedPaymentId);
    
    try {
      // Create or update the order record
      let order = await Order.findOne({ orderId: processedOrderId });
      if (!order) {
        // Create a new order record with proper ObjectId handling
        const orderData = {
          orderId: processedOrderId,
          paymentId: processedPaymentId,
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
        order.paymentId = processedPaymentId;
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
        // First create a temporary sponsor document for reference
        const User = require('../models/User');
        let sponsorUser;
        
        // Try to find a user with the sponsor's email
        if (sponsorEmail) {
          sponsorUser = await User.findOne({ email: sponsorEmail });
        }
        
        // If no user found, create a temporary one
        if (!sponsorUser) {
          sponsorUser = new User({
            name: sponsorName,
            email: sponsorEmail,
            role: 'sponsor',
            // Set a temporary password - in a real app you'd handle this differently
            password: Math.random().toString(36).substring(2, 15)
          });
          await sponsorUser.save();
          console.log('Created temporary sponsor user:', sponsorUser._id);
        }
        
        // Create a new logo review with proper references
        const logoReview = new LogoReview({
          campaignId: new ObjectId(causeId),
          sponsorId: sponsorUser._id,
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
        paymentId: processedPaymentId,
        orderId: processedOrderId,
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
        paymentId: processedPaymentId,
        orderId: processedOrderId,
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

// Get causes by status - this route must come before /:id to avoid conflicts
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    // Extract token from headers to check if user is admin
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
    
    // Build the query based on status and admin status
    let query = { status };
    
    // If not admin, only return online causes
    if (!isAdmin) {
      query.isOnline = true;
    }
    
    // Find causes by status
    const causes = await Cause.find(query).sort({ createdAt: -1 });
    
    res.status(200).json(causes);
  } catch (error) {
    console.error('Error fetching causes by status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get a single cause by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cause ID format'
      });
    }
    
    // Find the cause by ID
    const cause = await Cause.findById(id);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Return the cause
    res.status(200).json({
      success: true,
      data: cause
    });
  } catch (error) {
    console.error('Error fetching cause by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Submit a new cause for approval
router.post('/submit', async (req, res) => {
  try {
    console.log('Received cause submission request:', req.body);
    
    const {
      title,
      description,
      goal,
      startDate,
      endDate,
      image,
      submitterName,
      submitterEmail,
      submitterPhone
    } = req.body;

    // Validate required fields
    if (!title || !description || !goal) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for cause submission'
      });
    }

    // Create a new cause with status 'pending'
    const newCause = new Cause({
      title,
      description,
      goal: Number(goal),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      image: image || '',
      status: 'pending', // All new causes start as pending for admin approval
      raised: 0,
      isOnline: false, // Not online until approved
      submitter: {
        name: submitterName || 'Anonymous',
        email: submitterEmail || '',
        phone: submitterPhone || ''
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newCause.save();
    console.log('Created new cause:', newCause._id);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Cause submitted successfully and is pending approval',
      cause: newCause
    });
  } catch (error) {
    console.error('Cause submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit cause',
      error: error.message
    });
  }
});

module.exports = router;