import Customer from "../models/Customer.js";
import CreditTransaction from "../models/CreditTransaction.js";
import mongoose from "mongoose";

// Customer Controllers

// Get all customers for a user
export const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const storeId = req.storeId;

    let query = { storeId, isActive: true };

    // Add search functionality
    if (search) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const skip = (page - 1) * limit;
    
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: error.message
    });
  }
};

// Get customer statistics
export const getCustomerStatistics = async (req, res) => {
  try {
    const storeId = req.storeId;
    
    const stats = await Customer.getStatistics(storeId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Get customer statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer statistics",
      error: error.message
    });
  }
};

// Get single customer
export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId;

    const customer = await Customer.findOne({ _id: id, storeId, isActive: true });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Get customer transaction statistics
    const transactionStats = await CreditTransaction.getCustomerStatistics(id);
    
    // Update customer balances if needed
    if (customer.totalCredit !== transactionStats.totalCredit || 
        customer.totalPaid !== transactionStats.totalPaid) {
      customer.totalCredit = transactionStats.totalCredit;
      customer.totalPaid = transactionStats.totalPaid;
      customer.balance = transactionStats.balance;
      await customer.save();
    }

    res.status(200).json({
      success: true,
      data: {
        ...customer.toObject(),
        ...transactionStats
      }
    });
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer",
      error: error.message
    });
  }
};

// Create new customer
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const storeId = req.storeId;

    // Check if customer with same phone exists for this store
    const existingCustomer = await Customer.findOne({ 
      storeId, 
      phone, 
      isActive: true 
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone number already exists"
      });
    }

    const customer = new Customer({
      name,
      phone,
      address,
      storeId
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating customer",
      error: error.message
    });
  }
};

// Update customer
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;
    const storeId = req.storeId;

    // Check if customer with same phone exists for this store (excluding current customer)
    if (phone) {
      const existingCustomer = await Customer.findOne({ 
        storeId, 
        phone, 
        _id: { $ne: id },
        isActive: true 
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this phone number already exists"
        });
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: id, storeId, isActive: true },
      { name, phone, address },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating customer",
      error: error.message
    });
  }
};

// Delete customer (soft delete)
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const customer = await Customer.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully"
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting customer",
      error: error.message
    });
  }
};

// Transaction Controllers

// Get transactions for a customer
export const getCustomerTransactions = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10, type } = req.query;
    const storeId = req.storeId;

    // Verify customer belongs to store
    const customer = await Customer.findOne({ 
      _id: customerId, 
      storeId, 
      isActive: true 
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    let query = { 
      customerId, 
      status: { $ne: "cancelled" } 
    };

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const transactions = await CreditTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('customerId', 'name phone');

    const total = await CreditTransaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Get customer transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer transactions",
      error: error.message
    });
  }
};

// Create new transaction
export const createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, type, amount, description, dueDate } = req.body;
    const storeId = req.storeId;

    // Verify customer belongs to store
    const customer = await Customer.findOne({ 
      _id: customerId, 
      storeId, 
      isActive: true 
    }).session(session);

    if (!customer) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Create transaction
    const transaction = new CreditTransaction({
      customerId,
      storeId,
      type,
      amount: parseFloat(amount),
      description,
      dueDate: dueDate ? new Date(dueDate) : null
    });

    await transaction.save({ session });

    // Update customer balances
    if (type === 'credit-given') {
      customer.totalCredit += parseFloat(amount);
    } else if (type === 'payment-received') {
      customer.totalPaid += parseFloat(amount);
    }
    
    customer.balance = customer.totalCredit - customer.totalPaid;
    await customer.save({ session });

    await session.commitTransaction();

    const populatedTransaction = await CreditTransaction.findById(transaction._id)
      .populate('customerId', 'name phone');

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: populatedTransaction
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating transaction",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Update transaction
export const updateTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { amount, description, dueDate } = req.body;
    const userId = req.user.id;

    const transaction = await CreditTransaction.findOne({ 
      _id: id, 
      userId,
      status: 'pending'
    }).session(session);

    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Transaction not found or cannot be updated"
      });
    }

    const oldAmount = transaction.amount;
    const newAmount = parseFloat(amount);
    const amountDifference = newAmount - oldAmount;

    // Update transaction
    transaction.amount = newAmount;
    transaction.description = description;
    transaction.dueDate = dueDate ? new Date(dueDate) : null;
    await transaction.save({ session });

    // Update customer balances
    const customer = await Customer.findById(transaction.customerId).session(session);
    
    if (transaction.type === 'credit-given') {
      customer.totalCredit += amountDifference;
    } else if (transaction.type === 'payment-received') {
      customer.totalPaid += amountDifference;
    }
    
    customer.balance = customer.totalCredit - customer.totalPaid;
    await customer.save({ session });

    await session.commitTransaction();

    const populatedTransaction = await CreditTransaction.findById(transaction._id)
      .populate('customerId', 'name phone');

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: populatedTransaction
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Update transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating transaction",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Delete transaction
export const deleteTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const storeId = req.storeId;

    const transaction = await CreditTransaction.findOne({ 
      _id: id, 
      storeId,
      status: 'pending'
    }).session(session);

    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Transaction not found or cannot be deleted"
      });
    }

    // Update transaction status to cancelled
    transaction.status = 'cancelled';
    await transaction.save({ session });

    // Update customer balances
    const customer = await Customer.findById(transaction.customerId).session(session);
    
    if (transaction.type === 'credit-given') {
      customer.totalCredit -= transaction.amount;
    } else if (transaction.type === 'payment-received') {
      customer.totalPaid -= transaction.amount;
    }
    
    customer.balance = customer.totalCredit - customer.totalPaid;
    await customer.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully"
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting transaction",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get all transactions for a user (across all customers)
export const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, customerId } = req.query;
    const storeId = req.storeId;

    let query = { 
      storeId,
      status: { $ne: "cancelled" } 
    };

    if (type) {
      query.type = type;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    const skip = (page - 1) * limit;

    const transactions = await CreditTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('customerId', 'name phone address');

    const total = await CreditTransaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Get all transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message
    });
  }
};

// Get transaction summary for user
export const getTransactionSummary = async (req, res) => {
  try {
    const storeId = req.storeId;
    
    const summary = await CreditTransaction.getStoreSummary(storeId);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error("Get transaction summary error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transaction summary",
      error: error.message
    });
  }
};