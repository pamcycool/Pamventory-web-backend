import User from '../models/User.js';
import Store from '../models/Store.js';
import Subscription from '../models/Subscription.js';

// Get all users with their stores and subscription info
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('stores')
      .populate('activeStoreId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get all stores
export const getAllStores = async (req, res) => {
  try {
    const stores = await Store.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: stores.length,
      data: stores
    });
  } catch (error) {
    console.error('Get all stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stores',
      error: error.message
    });
  }
};

// Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message
    });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStores = await Store.countDocuments();
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    // Subscription stats
    const trialUsers = await User.countDocuments({ subscriptionStatus: 'TRIAL' });
    const activeSubscriptions = await User.countDocuments({ subscriptionStatus: 'ACTIVE' });
    const expiredSubscriptions = await User.countDocuments({ subscriptionStatus: 'EXPIRED' });

    // Get subscriptions if Subscription model exists
    let totalSubscriptions = 0;
    let subscriptionRevenue = 0;
    try {
      totalSubscriptions = await Subscription.countDocuments();
      const subscriptions = await Subscription.find({ status: 'active' });
      subscriptionRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
    } catch (error) {
      console.log('Subscription model might not exist:', error.message);
    }

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
          trial: trialUsers,
          activeSubscription: activeSubscriptions,
          expired: expiredSubscriptions
        },
        stores: {
          total: totalStores
        },
        subscriptions: {
          total: totalSubscriptions,
          revenue: subscriptionRevenue
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['User', 'Admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "User" or "Admin"'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Also delete user's stores
    await Store.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: 'User and associated stores deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Get user details
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .populate('stores')
      .populate('activeStoreId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: error.message
    });
  }
};
