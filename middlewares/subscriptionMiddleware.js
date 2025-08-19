import User from '../models/User.js';

export const checkSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const now = new Date();

    // Check if user is in trial period
    if (user.subscriptionStatus === 'TRIAL' && now < user.trialEndDate) {
      return next();
    }

    // Check if user has active subscription
    if (user.subscriptionStatus === 'ACTIVE') {
      return next();
    }

    // If neither trial nor active subscription
    return res.status(403).json({
      status: 'error',
      message: 'Please subscribe to access this feature',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify subscription status'
    });
  }
};