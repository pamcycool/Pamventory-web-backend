import express from 'express';
import {
  signUp,
  signIn,
  signUpUserGmail,
  loginUserGmail,
  verifyEmail,
  resendVerificationOTP,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  changePassword
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/gmail/signup', signUpUserGmail);
router.post('/gmail/login', loginUserGmail);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-otp', resendVerificationOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

export default router;