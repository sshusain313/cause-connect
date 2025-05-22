const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// Load environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@causeconnect.com';

// Create reusable transporter
const createTransporter = () => {
  // For development, use a test account if credentials aren't provided
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('Email credentials not found, using test account');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.password'
      }
    });
  }

  // For production, use real credentials
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
};

// Get template content
const getTemplate = (templateName) => {
  try {
    // Check if templates directory exists, if not create it
    const templatesDir = path.join(__dirname, '../templates/emails');
    if (!fs.existsSync(path.join(__dirname, '../templates'))) {
      fs.mkdirSync(path.join(__dirname, '../templates'));
    }
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir);
    }
    
    const templatePath = path.join(templatesDir, `${templateName}.html`);
    
    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      console.log(`Template ${templateName} not found, using default template`);
      return handlebars.compile(`
        <h1>{{title}}</h1>
        <p>{{message}}</p>
        <p>Thank you for using CauseConnect!</p>
      `);
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return handlebars.compile(templateContent);
  } catch (error) {
    console.error('Error loading email template:', error);
    // Return a simple default template
    return handlebars.compile(`
      <h1>CauseConnect Notification</h1>
      <p>Thank you for using CauseConnect!</p>
    `);
  }
};

// Send email
const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const transporter = createTransporter();
    
    // Get template
    const compiledTemplate = getTemplate(template);
    
    // Set default data
    const templateData = {
      title: subject,
      message: 'Thank you for using CauseConnect!',
      ...data
    };
    
    // Compile HTML
    const html = compiledTemplate(templateData);
    
    // Send mail
    const info = await transporter.sendMail({
      from: `"CauseConnect" <${EMAIL_FROM}>`,
      to,
      subject,
      html
    });
    
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail
};
