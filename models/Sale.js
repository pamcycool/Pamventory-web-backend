import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Product ID is required"]
    },
    productName: {
        type: String,
        required: [true, "Product name is required"],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [1, "Quantity must be at least 1"]
    },
    unitPrice: {
        type: Number,
        required: [true, "Unit price is required"],
        min: [0, "Unit price cannot be negative"]
    },
    totalPrice: {
        type: Number,
        required: [true, "Total price is required"],
        min: [0, "Total price cannot be negative"]
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"]
    },
    saleDate: {
        type: Date,
        default: Date.now
    },
    category: {
        type: String,
        trim: true,
        default: "General"
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "transfer", "card", "credit"],
        default: "cash"
    },
    customerName: {
        type: String,
        trim: true,
        default: null
    },
    notes: {
        type: String,
        maxlength: [500, "Notes cannot exceed 500 characters"],
        default: null
    }
}, {
    timestamps: true
});

// Index for better query performance
saleSchema.index({ userId: 1, saleDate: -1 });
saleSchema.index({ userId: 1, productId: 1 });
saleSchema.index({ userId: 1, productName: 1 });
saleSchema.index({ userId: 1, totalPrice: -1 });

// Virtual for formatted date
saleSchema.virtual('formattedDate').get(function() {
    return this.saleDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
});

// Static method to get sales statistics for a user
saleSchema.statics.getSalesStats = function(userId, startDate, endDate) {
    const matchQuery = { userId: new mongoose.Types.ObjectId(userId) };
    
    if (startDate || endDate) {
        matchQuery.saleDate = {};
        if (startDate) matchQuery.saleDate.$gte = new Date(startDate);
        if (endDate) matchQuery.saleDate.$lte = new Date(endDate);
    }

    return this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalSales: { $sum: 1 },
                totalRevenue: { $sum: "$totalPrice" },
                averageSaleValue: { $avg: "$totalPrice" },
                totalQuantitySold: { $sum: "$quantity" }
            }
        }
    ]);
};

// Static method to get top selling products
saleSchema.statics.getTopSellingProducts = function(userId, limit = 10) {
    return this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: "$productId",
                productName: { $first: "$productName" },
                totalQuantitySold: { $sum: "$quantity" },
                totalRevenue: { $sum: "$totalPrice" },
                salesCount: { $sum: 1 }
            }
        },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: limit }
    ]);
};

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;