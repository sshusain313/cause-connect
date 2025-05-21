const express = require('express');
const router = express.Router();
const LogoReview = require('../../models/LogoReview');
const { isAdmin } = require('../../middleware/auth');

// Get all logo reviews with populated campaign and sponsor details
router.get('/', isAdmin, async (req, res) => {
  try {
    const reviews = await LogoReview.find()
      .populate('campaignId', 'name')
      .populate('sponsorId', 'name email')
      .sort('-createdAt');
    
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching logo reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logo reviews'
    });
  }
});

// Update logo review status
router.patch('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const review = await LogoReview.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Logo review not found'
      });
    }

    // Update status
    review.status = status;

    // Add comment if provided
    if (comment) {
      review.comments.push({
        ...comment,
        at: new Date()
      });
    }

    await review.save();

    res.json({
      success: true,
      message: 'Logo review updated successfully'
    });
  } catch (error) {
    console.error('Error updating logo review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update logo review'
    });
  }
});

module.exports = router;
