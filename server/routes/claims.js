const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const ToteClaim = require('../models/ToteClaim');
const Campaign = require('../models/Campaign');
const Cause = require('../models/Cause');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../utils/jwt');
const { sendClaimConfirmationEmail } = require('../utils/emailService');
const mongoose = require('mongoose');

// Get claims by user ID
router.get('/user/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is requesting their own claims or is an admin
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to user claims'
      });
    }

    // First try to get tote claims
    let claims = await ToteClaim.find({ userId })
      .populate('causeId', 'title imageUrl status')
      .sort({ createdAt: -1 })
      .lean();

    // If no tote claims, try to get regular claims (for backward compatibility)
    if (claims.length === 0) {
      claims = await Claim.find({ userId })
        .populate('causeId', 'title imageUrl status')
        .populate('campaignId', 'name logo')
        .sort({ createdAt: -1 })
        .lean();
    }

    res.status(200).json(claims);
  } catch (error) {
    console.error('Error fetching user claims:', error);
    next(error);
  }
});

// Get all claims with filters (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  console.log('Claims request received:', { query: req.query, user: req.user });
  try {
    const { page = 1, status, campaign, from, to, q } = req.query;
    const filter = {};

    // Apply filters
    if (status) filter.status = status.toUpperCase();
    if (campaign) filter.campaignId = campaign;
    if (from || to) {
      filter.createdAt = {
        ...(from && { $gte: new Date(from) }),
        ...(to && { $lte: new Date(to) })
      };
    }
    if (q) filter.$text = { $search: q };

    // Get paginated results
    console.log('Applying filters:', filter);
    const [claims, total] = await Promise.all([
      Claim.find(filter)
        .populate('campaignId')
        .populate('causeId')
        .populate('userId', 'name email')
        .skip((page - 1) * 20)
        .limit(20)
        .sort({ createdAt: -1 })
        .lean(),
      Claim.countDocuments(filter)
    ]);

    res.status(200).json({
      claims,
      total,
      page: +page,
      totalPages: Math.ceil(total / 20)
    });
  } catch (error) {
    next(error);
  }
});

// Get claim by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    // First try to find a tote claim
    let claim = await ToteClaim.findById(req.params.id)
      .populate('causeId')
      .populate('userId', 'name email')
      .populate('notes.by', 'name');

    // If not found, try to find a regular claim (for backward compatibility)
    if (!claim) {
      claim = await Claim.findById(req.params.id)
        .populate('campaignId')
        .populate('causeId')
        .populate('userId', 'name email')
        .populate('notes.by', 'name');
    }

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Check if user is authorized to view this claim
    if (claim.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this claim'
      });
    }

    res.status(200).json(claim);
  } catch (error) {
    console.error('Error fetching claim:', error);
    next(error);
  }
});

// Update claim status (admin only)
router.patch('/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, trackingUrl, note } = req.body;

    const claim = await Claim.findById(id)
      .populate('userId', 'email name')
      .populate('campaignId', 'name');

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Update status
    claim.status = status;

    // Add tracking info if provided
    if (trackingNumber) {
      claim.trackingNumber = trackingNumber;
      claim.trackingUrl = trackingUrl;
    }

    // Add note if provided
    if (note) {
      claim.notes.push({
        text: note,
        by: req.user.userId,
        at: new Date()
      });
    }

    await claim.save();

    // Send email notification if status changed to shipped
    if (status === 'SHIPPED' && trackingNumber) {
      await sendClaimConfirmationEmail(
        claim.userId.email,
        claim.userId.name,
        claim.campaignId.name,
        trackingNumber
      );
    }

    res.status(200).json({
      success: true,
      message: 'Claim status updated successfully',
      claim
    });
  } catch (error) {
    next(error);
  }
});

// Add proof of impact
router.post('/:id/proof', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { images, description } = req.body;

    const claim = await Claim.findById(id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Check if user owns this claim
    if (claim.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this claim'
      });
    }

    claim.proofOfImpact = {
      images,
      description,
      submittedAt: new Date()
    };

    await claim.save();

    res.status(200).json({
      success: true,
      message: 'Proof of impact added successfully',
      claim
    });
  } catch (error) {
    next(error);
  }
});

// Create a new tote claim
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { 
      userId, 
      causeId, 
      fullName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      organization,
      status = 'pending',
      fromWaitlist = false
    } = req.body;

    // Verify the user is creating a claim for themselves or is an admin
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to create claim for another user'
      });
    }

    // Verify the cause exists
    const cause = await Cause.findById(causeId);
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }

    // Create the tote claim
    const newClaim = new ToteClaim({
      userId,
      causeId,
      causeTitle: cause.title, // Store the cause title for easier reference
      fullName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      organization,
      status,
      fromWaitlist,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Initialize status history
      statusHistory: [{
        status,
        date: new Date(),
        note: 'Claim created'
      }]
    });

    await newClaim.save();

    // Update the cause's claim count
    cause.claimCount = (cause.claimCount || 0) + 1;
    await cause.save();

    // Update user's tote claim count
    const user = await User.findById(userId);
    if (user) {
      user.totesClaimed = (user.totesClaimed || 0) + 1;
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: 'Claim created successfully',
      claim: newClaim
    });
  } catch (error) {
    console.error('Error creating claim:', error);
    next(error);
  }
});

// Verify claim
router.patch('/:id/verify', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const claim = await Claim.findById(id);
    
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }
    
    claim.verified = true;
    claim.verifiedAt = new Date();
    await claim.save();
    
    res.status(200).json({
      success: true,
      message: 'Claim verified successfully',
      claim
    });
  } catch (error) {
    next(error);
  }
});

// Get all tote claims (for dashboard use)
router.get('/all', authenticateToken, async (req, res, next) => {
  try {
    console.log('Fetching all tote claims for user:', req.user.userId);
    
    // For security, we'll return necessary fields but exclude sensitive information
    const claims = await ToteClaim.find({})
      .select('_id userId causeId causeTitle fullName email phone organization address city state zipCode status createdAt updatedAt')
      .populate('causeId', 'title')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${claims.length} total claims`);
    
    // Make sure causeTitle is available for each claim
    const processedClaims = claims.map(claim => {
      // If causeId is populated and has a title, but causeTitle is missing
      if (claim.causeId && typeof claim.causeId === 'object' && claim.causeId.title && !claim.causeTitle) {
        return {
          ...claim,
          causeTitle: claim.causeId.title
        };
      }
      return claim;
    });
    
    res.status(200).json(processedClaims);
  } catch (error) {
    console.error('Error fetching all tote claims:', error);
    next(error);
  }
});

module.exports = router;
