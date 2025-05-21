const express = require('express');
const router = express.Router();
const multer = require('multer');
const { isAdmin } = require('../middleware/auth');
const LogoReview = require('../models/LogoReview');
// Temporary file storage
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get a logo review by ID
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const review = await LogoReview.findById(req.params.id)
      .populate('campaignId')
      .populate('sponsorId')
      .lean();

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Error fetching logo review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update logo review status
router.patch('/:id', isAdmin, async (req, res) => {
  try {
    const { action, payload } = req.body;
    const review = await LogoReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    switch (action) {
      case 'approve':
        review.status = 'APPROVED';
        break;
      case 'request_changes':
        review.status = 'CHANGES_REQUESTED';
        review.comments.push({
          by: req.user._id,
          text: payload,
          at: new Date(),
        });
        break;
      case 'reject':
        review.status = 'REJECTED';
        review.comments.push({
          by: req.user._id,
          text: payload,
          at: new Date(),
        });
        break;
      case 'recheck':
        // Re-run automated checks
        const checks = await runLogoChecks(review.originalUrl);
        review.checks = checks;
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    await review.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating logo review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment with optional screenshot
router.post('/:id/comment', isAdmin, upload.single('screenshot'), async (req, res) => {
  try {
    const review = await LogoReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const comment = {
      by: req.user._id,
      text: req.body.text,
      at: new Date(),
    };

    if (req.file) {
      // Save file locally
      const filename = `${Date.now()}-${req.file.originalname}`;
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, req.file.buffer);
      comment.screenshot = `/uploads/${filename}`;
    }

    review.comments.push(comment);
    await review.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all pending reviews
router.get('/pending', isAdmin, async (req, res) => {
  try {
    const reviews = await LogoReview.find({ status: 'PENDING' })
      .populate('campaignId')
      .populate('sponsorId')
      .lean();

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Re-run automated checks
router.post('/:id/recheck', isAdmin, async (req, res) => {
  try {
    const review = await LogoReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const checks = await runLogoChecks(review.originalUrl);
    review.checks = checks;
    await review.save();

    res.json({ success: true, checks });
  } catch (error) {
    console.error('Error re-running checks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
