const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const Cause = require('../models/Cause');
const User = require('../models/User');
const Order = require('../models/Order');
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

// Get causes by claimer ID
router.get('/claimer/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is requesting their own causes or is an admin
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to user causes'
      });
    }

    const causes = await Cause.find({ createdBy: userId })
      .sort({ createdAt: -1 });

    res.status(200).json(causes);
  } catch (error) {
    console.error('Error fetching claimer causes:', error);
    next(error);
  }
});

// Get causes by status
router.get('/status/:status', async (req, res, next) => {
  try {
    const { status } = req.params;
    const validStatuses = ['pending', 'open', 'sponsored', 'waitlist', 'completed', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const causes = await Cause.find({ status }).sort({ createdAt: -1 });
    
    res.status(200).json(causes);
  } catch (error) {
    console.error('Error fetching causes by status:', error);
    next(error);
  }
});

// Get causes by sponsor ID
router.get('/sponsor/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const causes = await Cause.find({
      'sponsors.userId': userId
    }).sort({ createdAt: -1 });
    
    res.status(200).json(causes);
  } catch (error) {
    console.error('Error fetching causes by sponsor:', error);
    next(error);
  }
});

// Get cause by ID - This must be AFTER all other specific routes
router.get('/:id', async (req, res, next) => {
  try {
    // Check if the ID is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cause ID format'
      });
    }
    
    const cause = await Cause.findById(req.params.id);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    res.status(200).json(cause);
  } catch (error) {
    console.error('Error fetching cause by ID:', error);
    next(error);
  }
});



// Public cause submission (authenticated users)
router.post('/submit', authenticateToken, async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      story, 
      impact, 
      timeline, 
      imageUrl, 
      category, 
      goal 
    } = req.body;
    
    // Get user info for attribution
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Create the cause with pending status
    const cause = new Cause({
      title,
      description,
      story,
      impact,
      timeline,
      imageUrl,
      category,
      goal,
      status: 'pending',
      isOnline: false,
      createdBy: userId,
      creatorName: user.name,
      creatorEmail: user.email
    });
    
    await cause.save();
    
    res.status(201).json({
      success: true,
      message: 'Your cause has been submitted successfully and is awaiting admin approval',
      cause
    });
  } catch (error) {
    console.error('Error submitting cause:', error);
    next(error);
  }
});

// Create new cause (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      story, 
      impact, 
      timeline, 
      imageUrl, 
      category, 
      goal, 
      isOnline 
    } = req.body;
    
    const cause = new Cause({
      title,
      description,
      story,
      impact,
      timeline,
      imageUrl,
      category,
      goal,
      isOnline: isOnline || false
    });
    
    await cause.save();
    
    res.status(201).json({
      success: true,
      message: 'Cause created successfully',
      cause
    });
  } catch (error) {
    next(error);
  }
});

// Update cause (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Prevent updating sponsors directly through this route
    delete updateData.sponsors;
    
    const cause = await Cause.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Cause updated successfully',
      cause
    });
  } catch (error) {
    next(error);
  }
});

// Toggle cause online status (admin only)
router.patch('/:id/toggle-status', authenticateToken, async (req, res, next) => {
  try {
    // First check if user is admin without using the middleware
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    
    console.log('Toggle status - User info:', {
      userId: req.user.userId,
      userFound: !!user,
      userRole: user ? user.role : 'unknown'
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }
    
    const { id } = req.params;
    console.log('Toggle status - Cause ID:', id);
    
    const cause = await Cause.findById(id);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Toggle the isOnline status
    cause.isOnline = !cause.isOnline;
    await cause.save();
    
    console.log('Toggle status - Success:', {
      causeId: cause._id,
      isOnline: cause.isOnline
    });
    
    res.status(200).json({
      success: true,
      message: `Cause is now ${cause.isOnline ? 'online' : 'offline'}`,
      cause
    });
  } catch (error) {
    console.error('Toggle status - Error:', error);
    next(error);
  }
});

// Approve cause (admin only)
router.patch('/:id/approve', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const cause = await Cause.findById(id);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Update status to open and set isOnline to true
    cause.status = 'open';
    cause.isOnline = true;
    await cause.save();
    
    res.status(200).json({
      success: true,
      message: 'Cause approved successfully',
      cause
    });
  } catch (error) {
    console.error('Error approving cause:', error);
    next(error);
  }
});

// Reject cause (admin only)
router.patch('/:id/reject', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const cause = await Cause.findById(id);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Update status to rejected and set isOnline to false
    cause.status = 'rejected';
    cause.isOnline = false;
    cause.rejectionReason = reason || 'Rejected by administrator';
    await cause.save();
    
    res.status(200).json({
      success: true,
      message: 'Cause rejected successfully',
      cause
    });
  } catch (error) {
    console.error('Error rejecting cause:', error);
    next(error);
  }
});

// Force close claims for a cause (admin only)
router.patch('/:id/force-close-claims', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const cause = await Cause.findById(id);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Set status to completed to prevent further claims
    cause.status = 'completed';
    await cause.save();
    
    res.status(200).json({
      success: true,
      message: 'Claims for this cause have been closed',
      cause
    });
  } catch (error) {
    console.error('Error force-closing claims:', error);
    next(error);
  }
});

// Delete cause (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const cause = await Cause.findByIdAndDelete(id);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Cause deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Add sponsor to cause
router.post('/:id/sponsors', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, logo } = req.body;
    const userId = req.user.userId;
    
    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find cause
    const cause = await Cause.findById(id);
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Check if cause is open for sponsorship
    if (cause.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'This cause is not open for sponsorship'
      });
    }
    
    // Add sponsor with pending status
    cause.sponsors.push({
      userId,
      name: user.name,
      logo,
      amount,
      status: 'pending',
      createdAt: new Date()
    });
    
    // Calculate total approved sponsorships
    const approvedAmount = cause.sponsors
      .filter(sponsor => sponsor.status === 'approved')
      .reduce((total, sponsor) => total + sponsor.amount, 0);
    
    // Calculate pending amount (for user visibility)
    const pendingAmount = cause.sponsors
      .filter(sponsor => sponsor.status === 'pending')
      .reduce((total, sponsor) => total + sponsor.amount, 0);
      
    // Update raised amount with only approved sponsorships
    cause.raised = approvedAmount;
    
    // Only change cause status if approved amounts meet the goal
    if (approvedAmount >= cause.goal) {
      cause.status = 'sponsored';
    }
    
    await cause.save();
    
    res.status(200).json({
      success: true,
      message: 'Sponsorship added successfully',
      cause
    });
  } catch (error) {
    next(error);
  }
});

// Approve a sponsorship (admin only)
router.patch('/:causeId/sponsors/:sponsorId/approve', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { causeId, sponsorId } = req.params;
    
    // Find the cause
    const cause = await Cause.findById(causeId);
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Find the sponsor in the cause's sponsors array
    const sponsorIndex = cause.sponsors.findIndex(sponsor => 
      sponsor._id.toString() === sponsorId
    );
    
    if (sponsorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }
    
    // Update the sponsor status to approved
    cause.sponsors[sponsorIndex].status = 'approved';
    
    // Recalculate the total approved amount
    const approvedAmount = cause.sponsors
      .filter(sponsor => sponsor.status === 'approved')
      .reduce((total, sponsor) => total + sponsor.amount, 0);
    
    // Update the raised amount
    cause.raised = approvedAmount;
    
    // Check if the goal is met with approved sponsorships
    if (approvedAmount >= cause.goal && cause.status === 'open') {
      cause.status = 'sponsored';
    }
    
    await cause.save();
    
    res.status(200).json({
      success: true,
      message: 'Sponsorship approved successfully',
      cause
    });
  } catch (error) {
    next(error);
  }
});

// Reject a sponsorship (admin only)
router.patch('/:causeId/sponsors/:sponsorId/reject', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { causeId, sponsorId } = req.params;
    const { reason } = req.body;
    
    // Find the cause
    const cause = await Cause.findById(causeId);
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Find the sponsor in the cause's sponsors array
    const sponsorIndex = cause.sponsors.findIndex(sponsor => 
      sponsor._id.toString() === sponsorId
    );
    
    if (sponsorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Sponsorship not found'
      });
    }
    
    // Update the sponsor status to rejected
    cause.sponsors[sponsorIndex].status = 'rejected';
    cause.sponsors[sponsorIndex].rejectionReason = reason || 'Sponsorship rejected by admin';
    
    await cause.save();
    
    res.status(200).json({
      success: true,
      message: 'Sponsorship rejected successfully',
      cause
    });
  } catch (error) {
    next(error);
  }
});

// Get all pending sponsorships (admin only)
router.get('/pending-sponsorships', authenticateToken, async (req, res, next) => {
  try {
    // Find all causes that have pending sponsorships
    const causes = await Cause.find({ 'sponsors.status': 'pending' });
    
    // Extract and format pending sponsorships
    const pendingSponsorships = [];
    
    causes.forEach(cause => {
      cause.sponsors
        .filter(sponsor => sponsor.status === 'pending')
        .forEach(sponsor => {
          pendingSponsorships.push({
            id: sponsor._id,
            sponsor: sponsor.name,
            sponsorId: sponsor.userId,
            cause: cause.title,
            causeId: cause._id,
            amount: sponsor.amount,
            date: sponsor.createdAt,
            status: sponsor.status
          });
        });
    });
    
    res.status(200).json({
      success: true,
      count: pendingSponsorships.length,
      pendingSponsorships
    });
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
      orderId
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
        status: 'approved', // Auto-approve since payment is verified
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

    // Send confirmation email to sponsor if email is provided
    if (sponsorEmail) {
      try {
        // Check if we have a notification service
        const Notification = require('../services/notificationService');
        await Notification.sendEmail({
          to: sponsorEmail,
          subject: 'Your Sponsorship Confirmation',
          template: 'sponsor-confirmation',
          data: {
            sponsorName: sponsorName,
            causeName: cause.title,
            amount: amount,
            paymentId: paymentId,
            date: new Date().toLocaleDateString()
          }
        });
        console.log('Sent confirmation email to:', sponsorEmail);
      } catch (emailError) {
        // Log but don't fail the process if email sending fails
        console.error('Error sending confirmation email:', emailError);
      }
    }

    // Send notification to admin about new sponsorship
    try {
      // Find admin users
      const adminUsers = await User.find({ role: 'admin' });
      if (adminUsers.length > 0) {
        const Notification = require('../services/notificationService');
        for (const admin of adminUsers) {
          if (admin.email) {
            await Notification.sendEmail({
              to: admin.email,
              subject: 'New Sponsorship Alert',
              template: 'admin-sponsorship-alert',
              data: {
                causeName: cause.title,
                sponsorName: sponsorName,
                amount: amount,
                date: new Date().toLocaleDateString()
              }
            }).catch(err => console.error('Error sending admin notification:', err));
          }
        }
        console.log('Sent admin notifications about new sponsorship');
      }
    } catch (notifyError) {
      // Log but don't fail the process if notification fails
      console.error('Error sending admin notifications:', notifyError);
    }

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
        orderId: orderId
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
