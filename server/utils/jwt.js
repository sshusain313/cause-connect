const jwt = require('jsonwebtoken');

// Generate access token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes
  );
};

// Generate refresh token (long-lived)
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7 days
  );
};

// Verify token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
  
  req.user = { userId: decoded.userId };
  next();
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticateToken,
  authorizeRoles
};
