const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  authenticateToken 
} = require('../utils/jwt');
const { sendOtpEmail } = require('../utils/emailService');

// Register a new user
router.post('/register', async (req, res, next) => {
  try {
    const { email, name, role } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      // If user exists but hasn't verified, allow re-registration
      if (!user.otp || !user.otp.code) {
        user.name = name;
        user.role = role;
      } else {
        return res.status(400).json({
          success: false,
          message: 'User already exists. Please login instead.'
        });
      }
    } else {
      // Create new user
      user = new User({
        email,
        name,
        role: role || 'visitor'
      });
    }
    
    // Generate OTP
    const otp = user.generateOTP();
    
    // Save user
    await user.save();
    
    // Send OTP email
    const emailSent = await sendOtpEmail(email, otp);
    
    if (!emailSent) {
      // Rollback user creation if email fails
      if (!user._id) {
        await User.deleteOne({ email });
      } else {
        user.otp = undefined;
        await user.save();
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.'
    });
  } catch (error) {
    next(error);
  }
});

// Request OTP
router.post('/request-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create a temporary user
      user = new User({
        email,
        name: email.split('@')[0], // Temporary name from email
        role: 'visitor'
      });
    }
    
    // Generate OTP
    const otp = user.generateOTP();
    
    // Save user
    await user.save();
    
    // Send OTP email
    const emailSent = await sendOtpEmail(email, otp);
    
    if (!emailSent) {
      // Clear OTP if email fails
      user.otp = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// Verify OTP and complete registration if name and role are provided
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp, name, role } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    // Verify OTP
    const isValid = user.verifyOTP(otp);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.'
      });
    }
    
    // Clear OTP
    user.clearOTP();
    
    // If name and role are provided, update user (registration flow)
    if (name && role) {
      user.name = name;
      user.role = role;
    }
    
    // Generate tokens for authentication
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    
    // Save user
    await user.save();
    
    // If this was just OTP verification without registration
    if (!name || !role) {
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully.'
      });
    }
    
    // Return full auth response for registration flow
    return res.status(200).json({
      success: true,
      message: 'Registration successful.',
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login with OTP
router.post('/login', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    console.log('Login attempt:', { email, otp });
    
    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    // Special case for admin login
    console.log('Checking admin login:', { 
      inputEmail: email, 
      envEmail: process.env.ADMIN_EMAIL,
      inputOtp: otp, 
      envPassword: process.env.ADMIN_PASSWORD,
      match: email === process.env.ADMIN_EMAIL && otp === process.env.ADMIN_PASSWORD
    });
    if (email === process.env.ADMIN_EMAIL && otp === process.env.ADMIN_PASSWORD) {
      // Generate tokens for admin
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      
      // Save refresh token
      user.refreshToken = refreshToken;
      await user.save();
      
      const responseData = {
        success: true,
        message: 'Admin login successful.',
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };
      console.log('Admin login successful, returning:', { 
        accessToken: accessToken ? 'present' : 'missing', 
        refreshToken: refreshToken ? 'present' : 'missing',
        userRole: user.role
      });
      return res.status(200).json(responseData);
    }
    
    // For regular users, verify OTP
    const isValid = user.verifyOTP(otp);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.'
      });
    }
    
    // Clear OTP
    user.clearOTP();
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }
    
    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token.'
      });
    }
    
    // Check if user exists and token matches
    const user = await User.findById(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token.'
      });
    }
    
    // Generate new tokens
    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    // Save new refresh token
    user.refreshToken = newRefreshToken;
    await user.save();
    
    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }
    
    // Find user by refresh token
    const user = await User.findOne({ refreshToken });
    
    if (user) {
      // Clear refresh token
      user.refreshToken = undefined;
      await user.save();
    }
    
    return res.status(200).json({
      success: true,
      message: 'Logout successful.'
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-refreshToken -otp');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
