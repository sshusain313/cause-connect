const express = require('express');
const router = express.Router();
const LogoReview = require('../models/LogoReview');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get a specific logo review by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const logoReview = await LogoReview.findById(req.params.id);
    
    if (!logoReview) {
      return res.status(404).json({ success: false, message: 'Logo review not found' });
    }
    
    res.json({ success: true, data: logoReview });
  } catch (error) {
    console.error('Error fetching logo review:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add a comment to a logo review
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { text, screenshot } = req.body;
    const by = req.user.name || req.user.email;
    
    if (!text) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }
    
    const logoReview = await LogoReview.findById(req.params.id);
    
    if (!logoReview) {
      return res.status(404).json({ success: false, message: 'Logo review not found' });
    }
    
    const newComment = {
      by,
      text,
      screenshot,
      at: new Date()
    };
    
    logoReview.comments.push(newComment);
    await logoReview.save();
    
    res.json({ 
      success: true, 
      message: 'Comment added successfully', 
      data: logoReview 
    });
  } catch (error) {
    console.error('Error adding comment to logo review:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update a logo review status
router.put('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid status is required (PENDING, APPROVED, CHANGES_REQUESTED, REJECTED)' 
      });
    }
    
    const logoReview = await LogoReview.findById(req.params.id);
    
    if (!logoReview) {
      return res.status(404).json({ success: false, message: 'Logo review not found' });
    }
    
    logoReview.status = status;
    await logoReview.save();
    
    res.json({ 
      success: true, 
      message: `Logo review status updated to ${status}`, 
      data: logoReview 
    });
  } catch (error) {
    console.error('Error updating logo review status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update logo checks
router.put('/:id/checks', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { checks } = req.body;
    
    if (!checks || !Array.isArray(checks)) {
      return res.status(400).json({ success: false, message: 'Valid checks array is required' });
    }
    
    const logoReview = await LogoReview.findById(req.params.id);
    
    if (!logoReview) {
      return res.status(404).json({ success: false, message: 'Logo review not found' });
    }
    
    logoReview.checks = checks;
    await logoReview.save();
    
    res.json({ 
      success: true, 
      message: 'Logo checks updated successfully', 
      data: logoReview 
    });
  } catch (error) {
    console.error('Error updating logo checks:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update corrected logo URL
router.put('/:id/corrected-url', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { correctedUrl } = req.body;
    
    if (!correctedUrl) {
      return res.status(400).json({ success: false, message: 'Corrected URL is required' });
    }
    
    const logoReview = await LogoReview.findById(req.params.id);
    
    if (!logoReview) {
      return res.status(404).json({ success: false, message: 'Logo review not found' });
    }
    
    logoReview.correctedUrl = correctedUrl;
    await logoReview.save();
    
    res.json({ 
      success: true, 
      message: 'Corrected URL updated successfully', 
      data: logoReview 
    });
  } catch (error) {
    console.error('Error updating corrected URL:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update logo color palette
router.put('/:id/palette', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { palette } = req.body;
    
    if (!palette || !Array.isArray(palette)) {
      return res.status(400).json({ success: false, message: 'Valid palette array is required' });
    }
    
    const logoReview = await LogoReview.findById(req.params.id);
    
    if (!logoReview) {
      return res.status(404).json({ success: false, message: 'Logo review not found' });
    }
    
    logoReview.palette = palette;
    await logoReview.save();
    
    res.json({ 
      success: true, 
      message: 'Logo palette updated successfully', 
      data: logoReview 
    });
  } catch (error) {
    console.error('Error updating logo palette:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update tote preview information
router.put('/:id/tote-preview', authenticateToken, async (req, res) => {
  try {
    const { totePreview } = req.body;
    
    if (!totePreview || typeof totePreview !== 'object') {
      return res.status(400).json({ success: false, message: 'Valid tote preview object is required' });
    }
    
    // Validate totePreview structure
    if (totePreview.logoSize === undefined || 
        !totePreview.logoPosition || 
        totePreview.logoPosition.x === undefined || 
        totePreview.logoPosition.y === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tote preview must include logoSize and logoPosition (x, y)' 
      });
    }
    
    const logoReview = await LogoReview.findById(req.params.id);
    
    if (!logoReview) {
      return res.status(404).json({ success: false, message: 'Logo review not found' });
    }
    
    // Update the tote preview information
    logoReview.totePreview = {
      logoSize: totePreview.logoSize,
      logoPosition: {
        x: totePreview.logoPosition.x,
        y: totePreview.logoPosition.y
      },
      previewImageUrl: totePreview.previewImageUrl || ''
    };
    
    await logoReview.save();
    
    res.json({ 
      success: true, 
      message: 'Tote preview updated successfully', 
      data: logoReview 
    });
  } catch (error) {
    console.error('Error updating tote preview:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Create a new logo review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { campaignId, sponsorId, originalUrl } = req.body;
    
    if (!campaignId || !sponsorId || !originalUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Campaign ID, Sponsor ID, and Original URL are required' 
      });
    }
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(sponsorId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid Campaign ID or Sponsor ID format' 
      });
    }
    
    const newLogoReview = new LogoReview({
      campaignId,
      sponsorId,
      originalUrl,
      status: 'PENDING',
      checks: [],
      comments: [],
      palette: [],
      totePreview: {
        logoSize: 20,
        logoPosition: {
          x: 50,
          y: 75
        },
        previewImageUrl: originalUrl
      }
    });
    
    await newLogoReview.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Logo review created successfully', 
      data: newLogoReview 
    });
  } catch (error) {
    console.error('Error creating logo review:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
