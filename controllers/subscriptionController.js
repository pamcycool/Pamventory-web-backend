import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import https from 'https';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Helper function to make Paystack API requests
const paystackRequest = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: PAYSTACK_BASE_URL,
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

export const initializeSubscription = async (req, res) => {
  try {
    const { plan, interval } = req.body;
    const user = req.user;

    // Calculate amount based on plan and interval
    let amount;
    if (interval === 'monthly') {
      amount = 2000 * 100; // ₦2,000 in kobo
    } else if (interval === 'yearly') {
      amount = 22000 * 100; // ₦22,000 in kobo
    } else {
      return res.status(400).json({ message: 'Invalid interval' });
    }

    // Initialize transaction with Paystack
    const response = await paystackRequest('/transaction/initialize', 'POST', {
      email: user.email,
      amount,
      callback_url: `${process.env.FRONTEND_URL}/settings?verify=true`,
      metadata: {
        userId: user._id.toString(),
        plan,
        interval
      }
    });

    if (!response.status) {
      throw new Error('Failed to initialize Paystack transaction');
    }

    // Create a pending subscription
    const subscription = await Subscription.create({
      user: user._id,
      plan: 'PREMIUM',
      startDate: new Date(),
      endDate: interval === 'monthly' ? 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days
      amount,
      interval,
      paystackReference: response.data.reference
    });

    res.status(200).json({
      status: 'success',
      data: {
        authorizationUrl: response.data.authorization_url,
        reference: response.data.reference
      }
    });
  } catch (error) {
    console.error('Subscription initialization error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize subscription'
    });
  }
};

export const verifySubscription = async (req, res) => {
  try {
    const { reference } = req.query;

    // Verify the transaction with Paystack
    const response = await paystackRequest(`/transaction/verify/${reference}`);

    if (!response.status || response.data.status !== 'success') {
      throw new Error('Payment verification failed');
    }

    // Update subscription status
    const subscription = await Subscription.findOne({ paystackReference: reference });
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.paymentStatus = 'COMPLETED';
    subscription.status = 'ACTIVE';
    await subscription.save();

    // Update user subscription status
    const user = await User.findById(subscription.user);
    user.subscriptionStatus = 'ACTIVE';
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Subscription payment verified successfully'
    });
  } catch (error) {
    console.error('Subscription verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify subscription'
    });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    const user = req.user;
    
    // Get current subscription
    const subscription = await Subscription.findOne({
      user: user._id,
      status: 'ACTIVE'
    }).sort({ createdAt: -1 });

    // Check trial status
    const now = new Date();
    const isInTrial = user.subscriptionStatus === 'TRIAL' && now < user.trialEndDate;
    const trialDaysLeft = isInTrial ? 
      Math.ceil((user.trialEndDate - now) / (1000 * 60 * 60 * 24)) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        subscriptionStatus: user.subscriptionStatus,
        isInTrial,
        trialDaysLeft,
        subscription: subscription ? {
          plan: subscription.plan,
          interval: subscription.interval,
          endDate: subscription.endDate,
          amount: subscription.amount / 100 // Convert back to Naira from kobo
        } : null
      }
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get subscription status'
    });
  }
};