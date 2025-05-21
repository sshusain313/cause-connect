import express, { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import paymentRoutes from './routes/payments';
import morgan from 'morgan';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Add request logging

// Add error handling for JSON parsing
const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'Invalid JSON payload' });
  } else {
    next(err);
  }
};

app.use(jsonErrorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/payments', paymentRoutes);

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      message: 'Validation Error',
      details: err.message
    });
    return;
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    res.status(409).json({
      message: 'Duplicate Entry',
      details: 'This record already exists'
    });
    return;
  }

  // Default error response
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

app.use(errorHandler);

const PORT = process.env.PORT || 5051; // Changed port to avoid conflicts

// Verify required environment variables
const requiredEnvVars = ['MONGODB_URI', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('MongoDB URI:', process.env.MONGODB_URI?.substring(0, 20) + '...');
  console.log('Razorpay integration enabled');
});
