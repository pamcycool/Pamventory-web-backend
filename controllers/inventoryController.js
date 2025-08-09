import Product from "../models/Product.js";
import mongoose from "mongoose";
import { deleteImage, extractPublicId } from "../config/cloudinary.js";

// Create a new product
export const createProduct = async (req, res) => {
    try {
        const { name, price, initialQuantity, restockLevel, category, description, sku } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!name || !price || !initialQuantity || !restockLevel) {
            return res.status(400).json({
                success: false,
                message: "Name, price, initial quantity, and restock level are required"
            });
        }

        // Check if SKU already exists (if provided)
        if (sku) {
            const existingSku = await Product.findOne({ sku });
            if (existingSku) {
                return res.status(400).json({
                    success: false,
                    message: "SKU already exists"
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
            userId
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

// Get all products for a user
export const getProducts = async (req, res) => {
    try {
        const userId = req.user.id;
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
        const query = { userId };

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

// Get a single product by ID
export const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const product = await Product.findOne({ _id: id, userId });

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

// Update a product
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        // Get existing product for photo handling
        const existingProduct = await Product.findOne({ _id: id, userId });
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
        delete updates.userId;
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
            { _id: id, userId },
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

// Delete a product
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const product = await Product.findOneAndDelete({ _id: id, userId });

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

// Update stock quantity (for sales/restocking)
export const updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, reason } = req.body;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (!type || !quantity || !['sale', 'restock', 'adjustment'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Type and quantity are required. Type must be 'sale', 'restock', or 'adjustment'"
            });
        }

        const product = await Product.findOne({ _id: id, userId });

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
        const userId = req.user.id;

        const stats = await Product.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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
        const userId = req.user.id;

        const lowStockProducts = await Product.getLowStockProducts(userId);

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
        const userId = req.user.id;

        const categories = await Product.distinct('category', { userId });

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