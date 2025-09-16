import Store from "../models/Store.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Create a new store
export const createStore = async (req, res) => {
  try {
    const { name, description, address, phone, settings } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Store name is required"
      });
    }

    // Check if store name already exists for this user
    const existingStore = await Store.findOne({ 
      userId, 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: "A store with this name already exists"
      });
    }

    // Create store
    const store = new Store({
      name,
      description,
      address,
      phone,
      userId,
      settings
    });

    await store.save();

    // Update user's stores array and set as active store if it's their first store
    const user = await User.findById(userId);
    user.stores.push(store._id);
    
    // If this is the user's first store, set it as active
    if (!user.activeStoreId) {
      user.activeStoreId = store._id;
    }
    
    await user.save();

    res.status(201).json({
      success: true,
      message: "Store created successfully",
      data: store
    });
  } catch (error) {
    console.error("Create store error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create store",
      error: error.message
    });
  }
};

// Get all stores for a user
export const getUserStores = async (req, res) => {
  try {
    const userId = req.user.id;

    const stores = await Store.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error("Get user stores error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stores",
      error: error.message
    });
  }
};

// Get a specific store
export const getStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid store ID"
      });
    }

    const store = await Store.findOne({ _id: storeId, userId });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }

    res.status(200).json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error("Get store error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch store",
      error: error.message
    });
  }
};

// Update a store
export const updateStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, description, address, phone, settings } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid store ID"
      });
    }

    const store = await Store.findOne({ _id: storeId, userId });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }

    // Check if new name conflicts with existing store names (excluding current store)
    if (name && name !== store.name) {
      const existingStore = await Store.findOne({ 
        userId, 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: storeId }
      });
      
      if (existingStore) {
        return res.status(400).json({
          success: false,
          message: "A store with this name already exists"
        });
      }
    }

    // Update store fields
    if (name) store.name = name;
    if (description !== undefined) store.description = description;
    if (address !== undefined) store.address = address;
    if (phone !== undefined) store.phone = phone;
    if (settings) store.settings = { ...store.settings, ...settings };

    await store.save();

    res.status(200).json({
      success: true,
      message: "Store updated successfully",
      data: store
    });
  } catch (error) {
    console.error("Update store error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update store",
      error: error.message
    });
  }
};

// Delete a store
export const deleteStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid store ID"
      });
    }

    const store = await Store.findOne({ _id: storeId, userId });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }

    // Check if this is the user's only store
    const user = await User.findById(userId);
    if (user.stores.length === 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your only store. Please create another store first."
      });
    }

    // Soft delete by setting isActive to false
    store.isActive = false;
    await store.save();

    // Remove from user's stores array
    user.stores = user.stores.filter(id => id.toString() !== storeId);
    
    // If this was the active store, set another store as active
    if (user.activeStoreId && user.activeStoreId.toString() === storeId) {
      user.activeStoreId = user.stores[0] || null;
    }
    
    await user.save();

    res.status(200).json({
      success: true,
      message: "Store deleted successfully"
    });
  } catch (error) {
    console.error("Delete store error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete store",
      error: error.message
    });
  }
};

// Set active store
export const setActiveStore = async (req, res) => {
  try {
    const { storeId } = req.body;
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

    // Verify the store belongs to the user and is active
    const store = await Store.findOne({ _id: storeId, userId });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found or inactive"
      });
    }

    // Update user's active store
    const user = await User.findById(userId);
    user.activeStoreId = storeId;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Active store updated successfully",
      data: { activeStoreId: storeId }
    });
  } catch (error) {
    console.error("Set active store error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set active store",
      error: error.message
    });
  }
};

// Get user's active store
export const getActiveStore = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate('activeStoreId');
    
    if (!user.activeStoreId) {
      return res.status(404).json({
        success: false,
        message: "No active store found"
      });
    }

    res.status(200).json({
      success: true,
      data: user.activeStoreId
    });
  } catch (error) {
    console.error("Get active store error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active store",
      error: error.message
    });
  }
};
