const express = require('express');
const router = express.Router();
const Cause = require('../models/Cause');
const Claim = require('../models/Claim');
const User = require('../models/User');
const { authenticateToken } = require('../utils/jwt');
const mongoose = require('mongoose');

// Get causes created by a claimer
router.get('/:userId/causes', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is requesting their own causes or is an admin
    if (req.user._id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to user causes'
      });
    }

    const causes = await Cause.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(causes);
  } catch (error) {
    console.error('Error fetching claimer causes:', error);
    next(error);
  }
});

// Get claimer dashboard stats
router.get('/:userId/stats', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is requesting their own stats or is an admin
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to user stats'
      });
    }

    // Get active causes count
    const activeCauses = await Cause.countDocuments({ 
      createdBy: userId,
      isOnline: true
    });

    // Get total raised amount across all causes
    const causesAggregate = await Cause.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: null, totalRaised: { $sum: '$raised' } } }
    ]);
    
    const totalRaised = causesAggregate.length > 0 ? causesAggregate[0].totalRaised : 0;

    // Get totes claimed count
    const totesClaimed = await Claim.countDocuments({ userId });

    res.status(200).json({
      activeCauses,
      totalRaised,
      totesClaimed
    });
  } catch (error) {
    console.error('Error fetching claimer stats:', error);
    next(error);
  }
});

module.exports = router;
