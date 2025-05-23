// Create a new cause with image upload
router.post('/', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    // Import the upload middleware
    const upload = require('../utils/upload');
    
    // Use multer single file upload middleware
    const uploadMiddleware = upload.single('image');
    
    uploadMiddleware(req, res, async function(err) {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }
      
      // Get form data from request
      const { title, category, description, story, goal } = req.body;
      
      // Validate required fields
      if (!title || !category || !description || !story || !goal) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }
      
      // Get image path if uploaded
      let imageUrl = '';
      if (req.file) {
        // Create relative URL for the image
        imageUrl = `/uploads/${req.file.filename}`;
      }
      
      // Create new cause document
      const newCause = new Cause({
        title,
        category,
        description,
        story,
        imageUrl,
        goal: Number(goal),
        status: 'pending', // Start as pending
        isOnline: true, // Set to true since admin is creating it
        createdBy: req.user.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Save to database
      await newCause.save();
      
      // Return success response
      res.status(201).json({
        success: true,
        message: 'Cause created successfully',
        cause: newCause
      });
    });
  } catch (error) {
    console.error('Error creating cause:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
