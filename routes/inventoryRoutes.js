import express from "express";
import {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getInventoryStats,
    getLowStockAlerts,
    getCategories
} from "../controllers/inventoryController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { checkSubscription } from "../middlewares/subscriptionMiddleware.js";
import { validateStoreAccess } from "../middlewares/storeMiddleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// All routes require active subscription
router.use(checkSubscription);

// All routes require active store
router.use(validateStoreAccess);

// Product CRUD routes
router.post("/products", upload.single('photo'), createProduct);
router.get("/products", getProducts);
router.get("/products/:id", getProduct);
router.put("/products/:id", upload.single('photo'), updateProduct);
router.delete("/products/:id", deleteProduct);

// Stock management routes
router.patch("/products/:id/stock", updateStock);

// Analytics and alerts routes
router.get("/stats", getInventoryStats);
router.get("/alerts/low-stock", getLowStockAlerts);
router.get("/categories", getCategories);

export default router;