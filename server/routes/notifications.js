const express = require('express');
const router = express.Router();
const Notification = require('../services/notificationService');
const { authenticateToken } = require('../utils/jwt'); // Fix: Use the correct authentication middleware

// Send email notification
router.post('/send-email', authenticateToken, async (req, res) => {
  try {
    const { to, subject, template, data } = req.body;
    
    // Validate required fields
    if (!to || !subject || !template) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, template'
      });
    }
    
    // Send email
    const result = await Notification.sendEmail({
      to,
      subject,
      template,
      data: data || {}
    });
    
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email notification',
      error: error.message
    });
  }
});

module.exports = router;
