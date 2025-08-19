import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true,
        maxlength: [100, "Product name cannot exceed 100 characters"]
    },
    price: {
        type: Number,
        required: [true, "Product price is required"],
        min: [0, "Price cannot be negative"]
    },
    currentQuantity: {
        type: Number,
        required: [true, "Current quantity is required"],
        min: [0, "Quantity cannot be negative"],
        default: 0
    },
    initialQuantity: {
        type: Number,
        required: [true, "Initial quantity is required"],
        min: [0, "Initial quantity cannot be negative"]
    },
    restockLevel: {
        type: Number,
        required: [true, "Restock level is required"],
        min: [0, "Restock level cannot be negative"]
    },
    photo: {
        type: String, // Store photo URL or file path
        default: null
    },
    isLowStock: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"]
    },
    category: {
        type: String,
        trim: true,
        default: "General"
    },
    sku: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values
    },
    description: {
        type: String,
        maxlength: [500, "Description cannot exceed 500 characters"]
    },
    lastRestocked: {
        type: Date,
        default: Date.now
    },
    totalSold: {
        type: Number,
        default: 0,
        min: [0, "Total sold cannot be negative"]
    }
}, {
    timestamps: true
});

// Pre-save middleware to check stock level and set isLowStock flag
productSchema.pre('save', function(next) {
    this.isLowStock = this.currentQuantity <= this.restockLevel;
    next();
});

// Method to update stock after sale
productSchema.methods.sellProduct = function(quantity) {
    if (this.currentQuantity < quantity) {
        throw new Error('Insufficient stock');
    }
    this.currentQuantity -= quantity;
    this.totalSold += quantity;
    this.isLowStock = this.currentQuantity <= this.restockLevel;
    return this.save();
};

// Method to restock product
productSchema.methods.restockProduct = function(quantity) {
    this.currentQuantity += quantity;
    this.lastRestocked = new Date();
    this.isLowStock = this.currentQuantity <= this.restockLevel;
    return this.save();
};

// Static method to get low stock products for a user
productSchema.statics.getLowStockProducts = function(userId) {
    return this.find({ 
        userId: userId, 
        isLowStock: true 
    }).sort({ currentQuantity: 1 });
};

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
    if (this.currentQuantity === 0) {
        return 'Out of Stock';
    } else if (this.isLowStock) {
        return 'Low Stock';
    } else {
        return 'In Stock';
    }
});

// Index for better query performance
productSchema.index({ userId: 1, name: 1 });
productSchema.index({ userId: 1, isLowStock: 1 });
productSchema.index({ userId: 1, currentQuantity: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;