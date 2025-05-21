const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const Cause = require('../models/Cause');
const User = require('../models/User');
const { authenticateToken, authorizeRoles, verifyToken } = require('../utils/jwt');
const { sendMagicLinkEmail } = require('../utils/emailService');

// Get all waitlist entries (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const waitlistEntries = await Waitlist.find().sort({ position: 1 });
    
    res.status(200).json(waitlistEntries);
  } catch (error) {
    next(error);
  }
});

// Get waitlist entry by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const waitlistEntry = await Waitlist.findById(req.params.id);
    
    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }
    
    // Check if user is authorized to view this waitlist entry
    if (waitlistEntry.userId.toString() !== req.user.userId && 
        !(await User.findOne({ _id: req.user.userId, role: 'admin' }))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this waitlist entry'
      });
    }
    
    res.status(200).json(waitlistEntry);
  } catch (error) {
    next(error);
  }
});

// Get waitlist entries by cause ID
router.get('/cause/:causeId', authenticateToken, async (req, res, next) => {
  try {
    const { causeId } = req.params;
    
    // Check if user is admin or sponsor of this cause
    const isAdmin = await User.findOne({ _id: req.user.userId, role: 'admin' });
    const isSponsor = await Cause.findOne({
      _id: causeId,
      'sponsors.userId': req.user.userId
    });
    
    if (!isAdmin && !isSponsor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these waitlist entries'
      });
    }
    
    const waitlistEntries = await Waitlist.find({ causeId }).sort({ position: 1 });
    
    res.status(200).json(waitlistEntries);
  } catch (error) {
    next(error);
  }
});

// Get waitlist entries by user ID
router.get('/user/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user is authorized to view these waitlist entries
    if (userId !== req.user.userId && 
        !(await User.findOne({ _id: req.user.userId, role: 'admin' }))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these waitlist entries'
      });
    }
    
    const waitlistEntries = await Waitlist.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json(waitlistEntries);
  } catch (error) {
    next(error);
  }
});

// Join waitlist
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      causeId,
      fullName,
      email,
      phone,
      organization,
      message,
      notifyEmail,
      notifySms
    } = req.body;
    
    const userId = req.user.userId;
    
    // Check if cause exists and has a waitlist
    const cause = await Cause.findById(causeId);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    if (cause.status !== 'waitlist') {
      return res.status(400).json({
        success: false,
        message: 'This cause does not have an active waitlist'
      });
    }
    
    // Check if user already on waitlist for this cause
    const existingEntry = await Waitlist.findOne({ causeId, userId });
    
    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'You are already on the waitlist for this cause'
      });
    }
    
    // Get current highest position
    const highestPosition = await Waitlist.findOne({ causeId }).sort({ position: -1 });
    const position = highestPosition ? highestPosition.position + 1 : 1;
    
    // Create new waitlist entry
    const waitlistEntry = new Waitlist({
      causeId,
      userId,
      fullName,
      email,
      phone,
      organization,
      message,
      notifyEmail: notifyEmail !== false, // Default to true
      notifySms: notifySms === true, // Default to false
      position
    });
    
    await waitlistEntry.save();
    
    res.status(201).json({
      success: true,
      message: 'Added to waitlist successfully',
      waitlistEntry
    });
  } catch (error) {
    next(error);
  }
});

// Update waitlist status (admin only)
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['waiting', 'notified', 'claimed', 'expired'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const waitlistEntry = await Waitlist.findById(id);
    
    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }
    
    // Update status
    waitlistEntry.status = status;
    
    // If status is expired, clear magic link data
    if (status === 'expired') {
      waitlistEntry.magicLinkToken = undefined;
      waitlistEntry.magicLinkSentAt = undefined;
      waitlistEntry.magicLinkExpires = undefined;
    }
    
    await waitlistEntry.save();
    
    res.status(200).json({
      success: true,
      message: 'Waitlist status updated successfully',
      waitlistEntry
    });
  } catch (error) {
    next(error);
  }
});

// Send magic link to waitlist user
router.post('/:id/send-magic-link', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const waitlistEntry = await Waitlist.findById(id);
    
    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }
    
    // Check if cause is available
    const cause = await Cause.findById(waitlistEntry.causeId);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    if (cause.status !== 'sponsored') {
      return res.status(400).json({
        success: false,
        message: 'Cause is not available for claiming'
      });
    }
    
    // Generate magic link token
    const token = waitlistEntry.generateMagicLink();
    
    // Save waitlist entry with token
    await waitlistEntry.save();
    
    // Generate magic link URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' 
      : 'http://localhost:8080';
    
    const magicLink = `${baseUrl}/claim/magic-link?token=${token}&causeId=${waitlistEntry.causeId}`;
    
    // Send email with magic link
    const emailSent = await sendMagicLinkEmail(
      waitlistEntry.email,
      waitlistEntry.fullName,
      cause.title,
      magicLink
    );
    
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send magic link email'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Magic link sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Verify magic link token
router.post('/verify-magic-link', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Find waitlist entry by token
    const waitlistEntry = await Waitlist.findOne({ magicLinkToken: token });
    
    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Verify token
    const isValid = waitlistEntry.verifyMagicLink(token);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    // Check if cause is still available
    const cause = await Cause.findById(waitlistEntry.causeId);
    
    if (!cause || cause.status !== 'sponsored' || cause.claimedBy) {
      return res.status(400).json({
        success: false,
        message: 'Cause is no longer available for claiming'
      });
    }
    
    res.status(200).json({
      valid: true,
      data: {
        userId: waitlistEntry.userId,
        waitlistId: waitlistEntry._id,
        causeId: waitlistEntry.causeId
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get magic link details
router.get('/magic-link-details/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Find waitlist entry by token
    const waitlistEntry = await Waitlist.findOne({ magicLinkToken: token });
    
    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Verify token
    const isValid = waitlistEntry.verifyMagicLink(token);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    // Get cause details
    const cause = await Cause.findById(waitlistEntry.causeId);
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    res.status(200).json({
      token,
      userId: waitlistEntry.userId,
      waitlistId: waitlistEntry._id,
      causeId: waitlistEntry.causeId,
      email: waitlistEntry.email,
      expires: waitlistEntry.magicLinkExpires,
      causeName: cause.title
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
