require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const causeRoutes = require('./routes/causes');
const claimRoutes = require('./routes/claims');
const waitlistRoutes = require('./routes/waitlist');
const paymentRoutes = require('./routes/payments');
const logoReviewRoutes = require('./routes/admin/logo-reviews');
const campaignRoutes = require('./routes/campaigns');
const logoReviewAdminRoutes = require('./routes/logo-review');
const claimerRoutes = require('./routes/claimers');

// Create Express app
const app = express();

// Middleware
// Define allowed origins
const allowedOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',') : 
  ['http://localhost:8080', 'https://cause-connect-app.windsurf.build'];

// Configure CORS
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/causes', causeRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/logo-reviews', logoReviewRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin/logo-review', logoReviewAdminRoutes);
app.use('/api/claimers', claimerRoutes);

// API root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CauseConnect API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5051;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Seed admin user on startup
const { seedAdmin } = require('./utils/seedAdmin');
seedAdmin();
