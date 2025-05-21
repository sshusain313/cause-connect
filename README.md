# CauseConnect

CauseConnect is a platform that connects causes with sponsors and claimers. It allows sponsors to support causes financially and claimers to request tote bags for sponsored causes.

## Project Structure

The project consists of two main parts:

1. **Frontend**: A React application built with Vite, TypeScript, and Shadcn UI components
2. **Backend**: An Express.js server with MongoDB for data storage and JWT authentication

## Environment Variables

The project uses the following environment variables:

### Frontend (.env file in app directory)
```
VITE_MONGODB_URI=mongodb+srv://shabahatsyed101:8flCr5MKAfy15JpW@cluster0.w8cgqlr.mongodb.net/
VITE_JWT_SECRET=3b3941cfe4cd28edffbc9984b59f7253
VITE_EMAIL_SERVICE=gmail
VITE_EMAIL_USER=shabahatsyed101@gmail.com
VITE_EMAIL_PASSWORD=bzvwfkneotxxekyd
VITE_ADMIN_EMAIL=admin@cause.com
VITE_ADMIN_PASSWORD=12345
VITE_API_BASE_URL=/api
```

### Backend (.env file in server directory)
```
MONGODB_URI=mongodb+srv://shabahatsyed101:8flCr5MKAfy15JpW@cluster0.w8cgqlr.mongodb.net/
JWT_SECRET=3b3941cfe4cd28edffbc9984b59f7253
EMAIL_SERVICE=gmail
EMAIL_USER=shabahatsyed101@gmail.com
EMAIL_PASSWORD=bzvwfkneotxxekyd
ADMIN_EMAIL=admin@cause.com
ADMIN_PASSWORD=12345
PORT=5000
```

## Getting Started

### Running the Backend

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm run dev
   ```

The server will start on port 5000 by default.

### Running the Frontend

1. Navigate to the app directory:
   ```
   cd app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

The frontend will start on port 8080 by default.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and OTP
- `POST /api/auth/request-otp` - Request an OTP for login or registration
- `POST /api/auth/verify-otp` - Verify an OTP
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### Causes
- `GET /api/causes` - Get all causes
- `GET /api/causes/:id` - Get cause by ID
- `GET /api/causes/status/:status` - Get causes by status
- `GET /api/causes/sponsor/:userId` - Get causes by sponsor ID
- `POST /api/causes` - Create new cause (admin only)
- `PUT /api/causes/:id` - Update cause (admin only)
- `DELETE /api/causes/:id` - Delete cause (admin only)
- `POST /api/causes/:id/sponsors` - Add sponsor to cause

### Claims
- `GET /api/claims` - Get all claims (admin only)
- `GET /api/claims/:id` - Get claim by ID
- `GET /api/claims/user/:userId` - Get claims by user ID
- `GET /api/claims/cause/:causeId` - Get claims by cause ID
- `POST /api/claims` - Create new claim
- `PUT /api/claims/:id/status` - Update claim status (admin only)
- `GET /api/claims/:id/timeline` - Get claim status timeline
- `POST /api/claims/:id/verify` - Verify claim with OTP

### Waitlist
- `GET /api/waitlist` - Get all waitlist entries (admin only)
- `GET /api/waitlist/:id` - Get waitlist entry by ID
- `GET /api/waitlist/cause/:causeId` - Get waitlist entries by cause ID
- `GET /api/waitlist/user/:userId` - Get waitlist entries by user ID
- `POST /api/waitlist` - Join waitlist
- `PUT /api/waitlist/:id/status` - Update waitlist status (admin only)
- `POST /api/waitlist/:id/send-magic-link` - Send magic link to waitlist user
- `POST /api/waitlist/verify-magic-link` - Verify magic link token
- `GET /api/waitlist/magic-link-details/:token` - Get magic link details

## Authentication Flow

The application uses JWT authentication with access and refresh tokens:

1. User enters email and requests OTP
2. OTP is sent to user's email
3. User enters OTP to login or register
4. Server validates OTP and returns access token and refresh token
5. Access token is used for API requests
6. Refresh token is used to get a new access token when it expires

## Admin User

An admin user is automatically created on server startup with the following credentials:
- Email: admin@cause.com
- Password: 12345

## License

This project is licensed under the MIT License.
