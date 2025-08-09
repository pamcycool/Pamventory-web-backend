import express from "express";
import {
    createSale,
    getSales,
    getSale,
    updateSale,
    deleteSale,
    getSalesStats,
    getFilterOptions
} from "../controllers/salesController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkSubscription } from "../middlewares/subscriptionMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// All routes require active subscription
router.use(checkSubscription);

// Sales CRUD routes
router.post("/", createSale);
router.get("/", getSales);
router.get("/filter-options", getFilterOptions);
router.get("/stats", getSalesStats);
router.get("/:id", getSale);
router.put("/:id", updateSale);
router.delete("/:id", deleteSale);

export default router;