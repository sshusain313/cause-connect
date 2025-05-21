const nodemailer = require('nodemailer');

// Create a transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send OTP email
const sendOtpEmail = async (email, otp) => {
  try {
    // Verify transporter configuration
    const verified = await transporter.verify();
    if (!verified) {
      console.error('SMTP connection failed');
      return false;
    }

    // Log email attempt
    console.log(`Attempting to send OTP email to: ${email}`);

    const mailOptions = {
      from: `"CauseConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4f46e5;">Your Verification Code</h2>
          <p>Hello,</p>
          <p>Your verification code for CauseConnect is:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
          <p>Thank you,<br>The CauseConnect Team</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check EMAIL_USER and EMAIL_PASSWORD');
    } else if (error.code === 'ESOCKET') {
      console.error('Network error. Please check your internet connection');
    }
    return false;
  }
};

// Send magic link email for waitlist
const sendMagicLinkEmail = async (email, fullName, causeName, magicLink) => {
  try {
    const mailOptions = {
      from: `"CauseConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Cause is Now Available!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4f46e5;">Good News, ${fullName}!</h2>
          <p>The cause you were waiting for is now available:</p>
          <p style="font-weight: bold; font-size: 18px;">${causeName}</p>
          <p>You can now claim your tote bag by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Claim Your Tote</a>
          </div>
          <p>This link will expire in 48 hours.</p>
          <p>If you didn't sign up for the waitlist, you can safely ignore this email.</p>
          <p>Thank you,<br>The CauseConnect Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return false;
  }
};

// Send claim confirmation email
const sendClaimConfirmationEmail = async (email, fullName, causeName, trackingNumber = null) => {
  try {
    let trackingInfo = '';
    if (trackingNumber) {
      trackingInfo = `
        <p>Your tote is on its way! Here's your tracking number:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold;">
          ${trackingNumber}
        </p>
      `;
    } else {
      trackingInfo = `
        <p>We've received your claim and are processing it. You'll receive another email with tracking information once your tote has been shipped.</p>
      `;
    }
    
    const mailOptions = {
      from: `"CauseConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Tote Claim Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4f46e5;">Thank You, ${fullName}!</h2>
          <p>Your claim for the following cause has been confirmed:</p>
          <p style="font-weight: bold; font-size: 18px;">${causeName}</p>
          ${trackingInfo}
          <p>You can check the status of your claim anytime by logging into your CauseConnect account.</p>
          <p>Thank you for your support!</p>
          <p>Best regards,<br>The CauseConnect Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending claim confirmation email:', error);
    return false;
  }
};

module.exports = {
  sendOtpEmail,
  sendMagicLinkEmail,
  sendClaimConfirmationEmail
};
