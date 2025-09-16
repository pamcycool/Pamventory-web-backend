import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

// Create a new sale
export const createSale = async (req, res) => {
    try {
        const { productId, quantity, unitPrice, paymentMethod, customerName, notes } = req.body;
        const storeId = req.storeId;

        // Validate required fields
        if (!productId || !quantity || !unitPrice) {
            return res.status(400).json({
                success: false,
                message: "Product ID, quantity, and unit price are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        // Find the product and verify it belongs to the store
        const product = await Product.findOne({ _id: productId, storeId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Check if there's enough stock
        if (product.currentQuantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${product.currentQuantity}, Requested: ${quantity}`
            });
        }

        // Calculate total price
        const totalPrice = unitPrice * quantity;

        // Create the sale record
        const sale = new Sale({
            productId,
            productName: product.name,
            quantity,
            unitPrice,
            totalPrice,
            storeId,
            category: product.category,
            paymentMethod: paymentMethod || "cash",
            customerName,
            notes
        });

        // Update product stock using the sellProduct method
        await product.sellProduct(quantity);

        // Save the sale
        await sale.save();

        // Populate product details for response
        await sale.populate('productId', 'name category photo');

        res.status(201).json({
            success: true,
            message: "Sale recorded successfully",
            data: sale
        });

    } catch (error) {
        console.error("Create sale error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get all sales with filtering and sorting
export const getSales = async (req, res) => {
    try {
        const storeId = req.storeId;
        const {
            page = 1,
            limit = 10,
            search,
            sortBy = "saleDate",
            sortOrder = "desc",
            startDate,
            endDate,
            productName,
            category,
            paymentMethod,
            minAmount,
            maxAmount
        } = req.query;

        // Build query object
        const query = { storeId };

        // Search functionality
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { notes: { $regex: search, $options: 'i' } }
            ];
        }

        // Date range filter
        if (startDate || endDate) {
            query.saleDate = {};
            if (startDate) query.saleDate.$gte = new Date(startDate);
            if (endDate) query.saleDate.$lte = new Date(endDate);
        }

        // Product name filter
        if (productName) {
            query.productName = { $regex: productName, $options: 'i' };
        }

        // Category filter
        if (category && category !== 'all') {
            query.category = category;
        }

        // Payment method filter
        if (paymentMethod && paymentMethod !== 'all') {
            query.paymentMethod = paymentMethod;
        }

        // Amount range filter
        if (minAmount || maxAmount) {
            query.totalPrice = {};
            if (minAmount) query.totalPrice.$gte = parseFloat(minAmount);
            if (maxAmount) query.totalPrice.$lte = parseFloat(maxAmount);
        }

        // Sort options
        const sortOptions = {};
        const validSortFields = ['saleDate', 'productName', 'quantity', 'unitPrice', 'totalPrice', 'createdAt'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'saleDate';
        const order = sortOrder === 'asc' ? 1 : -1;
        sortOptions[sortField] = order;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query with pagination
        const [sales, totalSales] = await Promise.all([
            Sale.find(query)
                .populate('productId', 'name category photo sku')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit)),
            Sale.countDocuments(query)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalSales / parseInt(limit));
        const hasNextPage = parseInt(page) < totalPages;
        const hasPrevPage = parseInt(page) > 1;

        res.status(200).json({
            success: true,
            data: sales,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalSales,
                hasNextPage,
                hasPrevPage,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error("Get sales error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get a single sale by ID
export const getSale = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sale ID"
            });
        }

        const sale = await Sale.findOne({ _id: id, storeId })
            .populate('productId', 'name category photo sku description');

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: "Sale not found"
            });
        }

        res.status(200).json({
            success: true,
            data: sale
        });

    } catch (error) {
        console.error("Get sale error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Update a sale (limited fields that can be updated)
export const updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { customerName, notes, paymentMethod } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sale ID"
            });
        }

        const sale = await Sale.findOne({ _id: id, storeId });

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: "Sale not found"
            });
        }

        // Only allow updating certain fields for data integrity
        const updateData = {};
        if (customerName !== undefined) updateData.customerName = customerName;
        if (notes !== undefined) updateData.notes = notes;
        if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;

        const updatedSale = await Sale.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('productId', 'name category photo sku');

        res.status(200).json({
            success: true,
            message: "Sale updated successfully",
            data: updatedSale
        });

    } catch (error) {
        console.error("Update sale error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Delete a sale (this will also restore the product stock)
export const deleteSale = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sale ID"
            });
        }

        const sale = await Sale.findOne({ _id: id, userId });

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: "Sale not found"
            });
        }

        // Find the product to restore stock
        const product = await Product.findById(sale.productId);
        if (product) {
            // Restore the stock that was sold
            await product.restockProduct(sale.quantity);
            // Update totalSold
            product.totalSold = Math.max(0, product.totalSold - sale.quantity);
            await product.save();
        }

        // Delete the sale
        await Sale.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Sale deleted successfully"
        });

    } catch (error) {
        console.error("Delete sale error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get sales statistics
export const getSalesStats = async (req, res) => {
    try {
        const storeId = req.storeId;
        const { startDate, endDate, period = "month" } = req.query;

        // Get overall stats
        const stats = await Sale.getSalesStats(storeId, startDate, endDate);
        
        // Build date filter for aggregations
        const dateFilter = { storeId: new mongoose.Types.ObjectId(storeId) };
        if (startDate || endDate) {
            dateFilter.saleDate = {};
            if (startDate) dateFilter.saleDate.$gte = new Date(startDate);
            if (endDate) dateFilter.saleDate.$lte = new Date(endDate);
        }

        // Get top selling products with date filtering
        const topProducts = await Sale.aggregate([
            { $match: dateFilter },
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
            { $limit: 5 }
        ]);

        // Get sales by period (daily, weekly, monthly)
        let groupBy;
        switch (period) {
            case 'day':
                groupBy = {
                    year: { $year: "$saleDate" },
                    month: { $month: "$saleDate" },
                    day: { $dayOfMonth: "$saleDate" }
                };
                break;
            case 'week':
                groupBy = {
                    year: { $year: "$saleDate" },
                    week: { $week: "$saleDate" }
                };
                break;
            default:
                groupBy = {
                    year: { $year: "$saleDate" },
                    month: { $month: "$saleDate" }
                };
        }

        const salesByPeriod = await Sale.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: groupBy,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: "$totalPrice" },
                    totalQuantity: { $sum: "$quantity" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
            { $limit: 12 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: stats[0] || {
                    totalSales: 0,
                    totalRevenue: 0,
                    averageSaleValue: 0,
                    totalQuantitySold: 0
                },
                topProducts,
                salesByPeriod
            }
        });

    } catch (error) {
        console.error("Get sales stats error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get available filter options
export const getFilterOptions = async (req, res) => {
    try {
        const storeId = req.storeId;

        // Get unique categories from store's sales
        const categories = await Sale.distinct('category', { storeId });
        
        // Get unique payment methods from store's sales
        const paymentMethods = await Sale.distinct('paymentMethod', { storeId });
        
        // Get unique product names from store's sales
        const productNames = await Sale.distinct('productName', { storeId });

        res.status(200).json({
            success: true,
            data: {
                categories: categories.filter(cat => cat), // Remove null/empty values
                paymentMethods: paymentMethods.filter(method => method),
                productNames: productNames.filter(name => name)
            }
        });

    } catch (error) {
        console.error("Get filter options error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};