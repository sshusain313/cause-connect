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
const logoReviewsAdminRoutes = require('./routes/admin/logo-reviews');
const campaignRoutes = require('./routes/campaigns');
const logoReviewRoutes = require('./routes/logo-review');
const claimerRoutes = require('./routes/claimers');
const notificationRoutes = require('./routes/notifications');

// Create Express app
const app = express();

// Middleware
// CORS configuration for production and development
const allowedOrigins = [
  'https://cause-connect-app.windsurf.build',
  'https://causebg.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`CORS blocked request from: ${origin}`);
      return callback(null, true); // Still allow for debugging, change to false in strict production
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

// Add explicit CORS headers for preflight requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*'); // Fallback
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});
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
app.use('/api/admin/logo-reviews', logoReviewsAdminRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/logo-review', logoReviewRoutes);
app.use('/api/claimers', claimerRoutes);
app.use('/api/notifications', notificationRoutes);

// API root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CauseConnect API' });
});

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
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
