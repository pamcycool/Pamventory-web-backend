import mongoose from "mongoose";

const creditTransactionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    type: {
      type: String,
      enum: ["credit-given", "payment-received"],
      required: [true, "Transaction type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    isOverdue: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
creditTransactionSchema.index({ customerId: 1, createdAt: -1 });
creditTransactionSchema.index({ storeId: 1, createdAt: -1 });
creditTransactionSchema.index({ dueDate: 1, type: 1 });

// Generate unique reference before saving
creditTransactionSchema.pre('save', function(next) {
  if (!this.reference) {
    this.reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  next();
});

// Check if transaction is overdue
creditTransactionSchema.pre('save', function(next) {
  if (this.dueDate && this.type === 'credit-given' && this.status === 'pending') {
    this.isOverdue = new Date() > this.dueDate;
  }
  next();
});

// Static method to get transaction statistics for a customer
creditTransactionSchema.statics.getCustomerStatistics = async function(customerId) {
  const stats = await this.aggregate([
    {
      $match: { 
        customerId: new mongoose.Types.ObjectId(customerId),
        status: { $ne: "cancelled" }
      }
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  let totalCredit = 0;
  let totalPaid = 0;

  stats.forEach(stat => {
    if (stat._id === 'credit-given') {
      totalCredit = stat.total;
    } else if (stat._id === 'payment-received') {
      totalPaid = stat.total;
    }
  });

  return {
    totalCredit,
    totalPaid,
    balance: totalCredit - totalPaid
  };
};

// Static method to get overdue transactions for a store
creditTransactionSchema.statics.getOverdueTransactions = async function(storeId) {
  return this.find({
    storeId: new mongoose.Types.ObjectId(storeId),
    type: 'credit-given',
    status: 'pending',
    dueDate: { $lt: new Date() }
  }).populate('customerId');
};

// Static method to get transactions summary for a store
creditTransactionSchema.statics.getStoreSummary = async function(storeId) {
  const summary = await this.aggregate([
    {
      $match: { 
        storeId: new mongoose.Types.ObjectId(storeId),
        status: { $ne: "cancelled" }
      }
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  let totalCredit = 0;
  let totalPaid = 0;

  summary.forEach(item => {
    if (item._id === 'credit-given') {
      totalCredit = item.total;
    } else if (item._id === 'payment-received') {
      totalPaid = item.total;
    }
  });

  return {
    totalCredit,
    totalPaid,
    outstandingAmount: totalCredit - totalPaid
  };
};

export default mongoose.model("CreditTransaction", creditTransactionSchema);