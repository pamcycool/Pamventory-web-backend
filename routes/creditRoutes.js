import express from "express";
import { 
  getCustomers, 
  getCustomer, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  getCustomerStatistics,
  getCustomerTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getAllTransactions,
  getTransactionSummary
} from "../controllers/creditController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkSubscription } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Apply subscription check to all routes
router.use(checkSubscription);

// Customer routes
router.get("/customers", getCustomers);
router.get("/customers/statistics", getCustomerStatistics);
router.get("/customers/:id", getCustomer);
router.post("/customers", createCustomer);
router.put("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);

// Transaction routes
router.get("/transactions", getAllTransactions);
router.get("/transactions/summary", getTransactionSummary);
router.get("/customers/:customerId/transactions", getCustomerTransactions);
router.post("/transactions", createTransaction);
router.put("/transactions/:id", updateTransaction);
router.delete("/transactions/:id", deleteTransaction);

export default router;