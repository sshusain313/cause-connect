const express = require('express');
const router = express.Router();
const LogoReview = require('../../models/LogoReview');
const { authenticateToken, isAdmin } = require('../../middleware/auth');
const mongoose = require('mongoose');

// Get all logo reviews (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, limit = 20, skip = 0 } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const total = await LogoReview.countDocuments(query);
    const logoReviews = await LogoReview.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('campaignId', 'title companyName')
      .populate({
        path: 'sponsorId',
        model: 'User',
        select: 'name'
      });
    
    res.json({ 
      success: true, 
      data: logoReviews,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching logo reviews:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Batch update logo reviews status (admin only)
router.put('/batch-update', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { ids, status } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid IDs array is required' });
    }
    
    if (!status || !['PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid status is required (PENDING, APPROVED, CHANGES_REQUESTED, REJECTED)' 
      });
    }
    
    // Validate all IDs are valid ObjectIds
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length !== ids.length) {
      return res.status(400).json({ success: false, message: 'Some IDs are invalid' });
    }
    
    const result = await LogoReview.updateMany(
      { _id: { $in: validIds } },
      { $set: { status, updatedAt: new Date() } }
    );
    
    res.json({ 
      success: true, 
      message: `${result.modifiedCount} logo reviews updated to ${status}`, 
      data: { modifiedCount: result.modifiedCount } 
    });
  } catch (error) {
    console.error('Error batch updating logo reviews:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get a specific logo review by ID (admin only)
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const logoReview = await LogoReview.findById(req.params.id)
      .populate('campaignId', 'title companyName logo')
      .populate({
        path: 'sponsorId',
        model: 'User',
        select: 'name'
      });
    
    if (!logoReview) {
      return res.status(404).json({ success: false, message: 'Logo review not found' });
    }
    
    res.json({ success: true, data: logoReview });
  } catch (error) {
    console.error('Error fetching logo review:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
