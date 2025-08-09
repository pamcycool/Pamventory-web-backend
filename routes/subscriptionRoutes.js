import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  initializeSubscription,
  verifySubscription,
  getSubscriptionStatus
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/initialize', protect, initializeSubscription);
router.get('/verify', protect, verifySubscription);
router.get('/status', protect, getSubscriptionStatus);

export default router;