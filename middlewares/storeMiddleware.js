import Store from '../models/Store.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Middleware to validate store access and set store context
export const validateStoreAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user with active store
    const user = await User.findById(userId).populate('activeStoreId');
    
    if (!user.activeStoreId) {
      return res.status(400).json({
        success: false,
        message: "No active store found. Please create or select a store first."
      });
    }

    // Add store to request object
    req.store = user.activeStoreId;
    req.storeId = user.activeStoreId._id;
    
    next();
  } catch (error) {
    console.error("Store validation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate store access",
      error: error.message
    });
  }
};

// Middleware to validate specific store access
export const validateSpecificStoreAccess = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid store ID"
      });
    }

    // Check if store exists and belongs to user
    const store = await Store.findOne({ _id: storeId, userId, isActive: true });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found or access denied"
      });
    }

    // Add store to request object
    req.store = store;
    req.storeId = store._id;
    
    next();
  } catch (error) {
    console.error("Specific store validation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate store access",
      error: error.message
    });
  }
};

// Middleware to check if user has any stores
export const checkUserStores = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    
    if (!user.stores || user.stores.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No stores found. Please create a store first."
      });
    }

    next();
  } catch (error) {
    console.error("Check user stores error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check user stores",
      error: error.message
    });
  }
};
