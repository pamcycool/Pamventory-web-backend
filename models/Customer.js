import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalCredit: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
customerSchema.index({ userId: 1, name: 1 });
customerSchema.index({ userId: 1, phone: 1 });

// Virtual for outstanding amount
customerSchema.virtual('outstandingAmount').get(function() {
  return this.balance;
});

// Method to update customer balances
customerSchema.methods.updateBalances = function() {
  this.balance = this.totalCredit - this.totalPaid;
  return this.save();
};

// Static method to get customer statistics for a user
customerSchema.statics.getStatistics = async function(userId) {
  const stats = await this.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true }
    },
    {
      $group: {
        _id: null,
        totalOutstanding: { $sum: "$balance" },
        totalCustomers: { $sum: 1 },
        overdueAmount: { 
          $sum: {
            $cond: [
              { $gt: ["$balance", 0] },
              "$balance",
              0
            ]
          }
        },
        creditCustomers: {
          $sum: {
            $cond: [
              { $gt: ["$balance", 0] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalOutstanding: 0,
    totalCustomers: 0,
    overdueAmount: 0,
    creditCustomers: 0
  };
};

export default mongoose.model("Customer", customerSchema);