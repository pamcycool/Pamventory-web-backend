import express from 'express';
import {
  getAllUsers,
  getAllStores,
  getAllSubscriptions,
  getDashboardStats,
  updateUserRole,
  deleteUser,
  getUserDetails
} from '../controllers/adminController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// Dashboard stats
router.get('/stats', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);

// Store management
router.get('/stores', getAllStores);

// Subscription management
router.get('/subscriptions', getAllSubscriptions);

export default router;
