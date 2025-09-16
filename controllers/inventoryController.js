import Product from "../models/Product.js";
import mongoose from "mongoose";
import { deleteImage, extractPublicId } from "../config/cloudinary.js";

// Create a new product
export const createProduct = async (req, res) => {
    try {
        const { name, price, initialQuantity, restockLevel, category, description, sku } = req.body;
        const storeId = req.storeId; // Get storeId from middleware

        // Validate required fields
        if (!name || !price || !initialQuantity || !restockLevel) {
            return res.status(400).json({
                success: false,
                message: "Name, price, initial quantity, and restock level are required"
            });
        }

        // Check if SKU already exists in the same store (if provided)
        if (sku) {
            const existingSku = await Product.findOne({ sku, storeId });
            if (existingSku) {
                return res.status(400).json({
                    success: false,
                    message: "SKU already exists in this store"
                });
            }
        }

        // Get photo URL from Cloudinary if uploaded
        const photoUrl = req.file ? req.file.path : null;

        // Create product
        const product = new Product({
            name,
            price: parseFloat(price),
            currentQuantity: parseInt(initialQuantity),
            initialQuantity: parseInt(initialQuantity),
            restockLevel: parseInt(restockLevel),
            category: category || "General",
            description,
            sku,
            photo: photoUrl,
            storeId
        });

        await product.save();

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product
        });
    } catch (error) {
        console.error("Create product error:", error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Product with this SKU already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Error creating product",
            error: error.message
        });
    }
};

// Get all products for a store
export const getProducts = async (req, res) => {
    try {
        const storeId = req.storeId; // Get storeId from middleware
        const { 
            page = 1, 
            limit = 10, 
            search, 
            category, 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            stockStatus 
        } = req.query;

        // Build query
        const query = { storeId };

        // Add search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        // Add category filter
        if (category && category !== 'all') {
            query.category = category;
        }

        // Add stock status filter
        if (stockStatus) {
            switch (stockStatus) {
                case 'low':
                    query.isLowStock = true;
                    query.currentQuantity = { $gt: 0 };
                    break;
                case 'out':
                    query.currentQuantity = 0;
                    break;
                case 'in':
                    query.isLowStock = false;
                    query.currentQuantity = { $gt: 0 };
                    break;
            }
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query
        const [products, total] = await Promise.all([
            Product.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Product.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching products",
            error: error.message
        });
    }
};

// Get a single product by ID or name
export const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;

        let product;

        // Check if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            // Search by ID
            product = await Product.findOne({ _id: id, storeId });
        } else {
            // Search by name (case-insensitive)
            product = await Product.findOne({ 
                name: { $regex: new RegExp(id, 'i') }, 
                storeId 
            });
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error("Get product error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching product",
            error: error.message
        });
    }
};

// Update a product by ID or name
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const updates = req.body;

        let existingProduct;
        let productId;

        // Check if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            // Search by ID
            existingProduct = await Product.findOne({ _id: id, storeId });
            productId = id;
        } else {
            // Search by name (case-insensitive)
            existingProduct = await Product.findOne({ 
                name: { $regex: new RegExp(id, 'i') }, 
                storeId 
            });
            if (existingProduct) {
                productId = existingProduct._id;
            }
        }

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Handle photo update
        if (req.file) {
            // Delete old photo from Cloudinary if exists
            if (existingProduct.photo) {
                const oldPublicId = extractPublicId(existingProduct.photo);
                if (oldPublicId) {
                    try {
                        await deleteImage(oldPublicId);
                    } catch (error) {
                        console.error("Error deleting old image:", error);
                    }
                }
            }
            updates.photo = req.file.path;
        }

        // Remove fields that shouldn't be updated directly
        delete updates.storeId;
        delete updates.totalSold;
        delete updates.createdAt;
        delete updates.updatedAt;

        // Validate numeric fields
        if (updates.price !== undefined) {
            updates.price = parseFloat(updates.price);
        }
        if (updates.currentQuantity !== undefined) {
            updates.currentQuantity = parseInt(updates.currentQuantity);
        }
        if (updates.restockLevel !== undefined) {
            updates.restockLevel = parseInt(updates.restockLevel);
        }

        const product = await Product.findOneAndUpdate(
            { _id: productId, storeId },
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: product
        });
    } catch (error) {
        console.error("Update product error:", error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "SKU already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Error updating product",
            error: error.message
        });
    }
};

// Delete a product by ID or name
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;

        let product;

        // Check if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            // Delete by ID
            product = await Product.findOneAndDelete({ _id: id, storeId });
        } else {
            // Delete by name (case-insensitive)
            product = await Product.findOneAndDelete({ 
                name: { $regex: new RegExp(id, 'i') }, 
                storeId 
            });
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Delete photo from Cloudinary if exists
        if (product.photo) {
            const publicId = extractPublicId(product.photo);
            if (publicId) {
                try {
                    await deleteImage(publicId);
                } catch (error) {
                    console.error("Error deleting image:", error);
                }
            }
        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting product",
            error: error.message
        });
    }
};

// Update stock quantity (for sales/restocking) by ID or name
export const updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, reason } = req.body;
        const storeId = req.storeId;

        if (!type || !quantity || !['sale', 'restock', 'adjustment'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Type and quantity are required. Type must be 'sale', 'restock', or 'adjustment'"
            });
        }

        let product;

        // Check if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            // Find by ID
            product = await Product.findOne({ _id: id, storeId });
        } else {
            // Find by name (case-insensitive)
            product = await Product.findOne({ 
                name: { $regex: new RegExp(id, 'i') }, 
                storeId 
            });
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const quantityNum = parseInt(quantity);

        try {
            switch (type) {
                case 'sale':
                    await product.sellProduct(quantityNum);
                    break;
                case 'restock':
                    await product.restockProduct(quantityNum);
                    break;
                case 'adjustment':
                    product.currentQuantity = quantityNum;
                    product.isLowStock = product.currentQuantity <= product.restockLevel;
                    await product.save();
                    break;
            }

            res.status(200).json({
                success: true,
                message: `Stock ${type} successful`,
                data: product
            });
        } catch (stockError) {
            return res.status(400).json({
                success: false,
                message: stockError.message
            });
        }
    } catch (error) {
        console.error("Update stock error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating stock",
            error: error.message
        });
    }
};

// Get inventory statistics
export const getInventoryStats = async (req, res) => {
    try {
        const storeId = req.storeId;

        const stats = await Product.aggregate([
            { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalValue: { $sum: { $multiply: ["$currentQuantity", "$price"] } },
                    lowStockCount: {
                        $sum: {
                            $cond: [{ $eq: ["$isLowStock", true] }, 1, 0]
                        }
                    },
                    outOfStockCount: {
                        $sum: {
                            $cond: [{ $eq: ["$currentQuantity", 0] }, 1, 0]
                        }
                    },
                    totalQuantity: { $sum: "$currentQuantity" }
                }
            }
        ]);

        const result = stats[0] || {
            totalProducts: 0,
            totalValue: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            totalQuantity: 0
        };

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Get inventory stats error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching inventory statistics",
            error: error.message
        });
    }
};

// Get low stock alerts
export const getLowStockAlerts = async (req, res) => {
    try {
        const storeId = req.storeId;

        const lowStockProducts = await Product.getLowStockProducts(storeId);

        res.status(200).json({
            success: true,
            data: lowStockProducts,
            count: lowStockProducts.length
        });
    } catch (error) {
        console.error("Get low stock alerts error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching low stock alerts",
            error: error.message
        });
    }
};

// Get product categories
export const getCategories = async (req, res) => {
    try {
        const storeId = req.storeId;

        const categories = await Product.distinct('category', { storeId });

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching categories",
            error: error.message
        });
    }
};