import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Store name is required"],
    trim: true,
    maxlength: [100, "Store name cannot exceed 100 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, "Address cannot exceed 200 characters"]
  },
  phone: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    currency: {
      type: String,
      default: "NGN"
    },
    timezone: {
      type: String,
      default: "Africa/Lagos"
    },
    businessHours: {
      type: String,
      default: "9:00 AM - 6:00 PM"
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
storeSchema.index({ userId: 1, name: 1 });
storeSchema.index({ userId: 1, isActive: 1 });

// Virtual for store status
storeSchema.virtual('status').get(function() {
  return this.isActive ? 'Active' : 'Inactive';
});

const Store = mongoose.model("Store", storeSchema);

export default Store;
