const mongoose = require('mongoose');
const LogoReview = require('../models/LogoReview');
const Campaign = require('../models/Campaign');
const User = require('../models/User');

/**
 * Seed logo reviews for testing
 */
const seedLogoReviews = async () => {
  try {
    // Check if we already have logo reviews
    const existingCount = await LogoReview.countDocuments();
    if (existingCount > 0) {
      console.log(`${existingCount} logo reviews already exist. Skipping seed.`);
      return;
    }

    // Find a campaign and sponsor to associate with the logo reviews
    const campaign = await Campaign.findOne();
    const sponsor = await User.findOne({ role: 'sponsor' });

    if (!campaign || !sponsor) {
      console.log('Cannot seed logo reviews: No campaigns or sponsors found');
      return;
    }

    // Sample logo URLs
    const logoUrls = [
      'https://placehold.co/400x200/png?text=Company+Logo+1',
      'https://placehold.co/400x200/png?text=Company+Logo+2',
      'https://placehold.co/400x200/png?text=Company+Logo+3',
      'https://placehold.co/400x200/png?text=Company+Logo+4',
      'https://placehold.co/400x200/png?text=Company+Logo+5'
    ];

    // Sample statuses
    const statuses = ['PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'];

    // Create sample logo reviews
    const logoReviews = [];
    for (let i = 0; i < 5; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const logoReview = new LogoReview({
        campaignId: campaign._id,
        sponsorId: sponsor._id,
        originalUrl: logoUrls[i],
        status,
        checks: [
          {
            name: 'Resolution',
            passed: Math.random() > 0.3,
            message: 'Logo resolution check'
          },
          {
            name: 'Format',
            passed: Math.random() > 0.3,
            message: 'Logo format check'
          },
          {
            name: 'Transparency',
            passed: Math.random() > 0.3,
            message: 'Logo transparency check'
          }
        ],
        comments: status !== 'PENDING' ? [
          {
            by: 'Admin',
            text: `This is a sample comment for ${status} logo`,
            at: new Date()
          }
        ] : [],
        palette: ['#FF5733', '#33FF57', '#3357FF', '#F3FF33']
      });

      logoReviews.push(logoReview);
    }

    // Save all logo reviews
    await LogoReview.insertMany(logoReviews);
    console.log(`${logoReviews.length} logo reviews seeded successfully`);
  } catch (error) {
    console.error('Error seeding logo reviews:', error);
  }
};

module.exports = { seedLogoReviews };
