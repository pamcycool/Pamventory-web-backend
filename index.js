import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import creditRoutes from "./routes/creditRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// Load environment variables
dotenv.config();

const app = express();
const corsOptions = {
  origin: "https://www.pamventory.com",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Conditional JSON parsing - skip multipart requests
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  console.log('Request content-type:', contentType);
  console.log('Request headers:', req.headers);
  
  // Skip JSON parsing for multipart requests OR requests without Content-Type
  if (contentType.includes('multipart/form-data') || !contentType) {
    console.log('Skipping JSON parsing for multipart/no-content-type request');
    return next();
  }
  
  console.log('Applying JSON parsing');
  express.json()(req, res, next);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/credit", creditRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
// Test endpoint
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "API is working!" });
});

// MongoDB connection with retry
const connectWithRetry = async (retries = 5, delay = 5000) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    if (retries === 0) {
      console.error("Max retries reached. Connection failed:", err);
      process.exit(1);
    }
    console.log(`Connection failed. Retrying in ${delay/1000} seconds... (${retries} attempts remaining)`);
    setTimeout(() => connectWithRetry(retries - 1, delay), delay);
  }
};

// Initialize connection with retry
connectWithRetry();

// For Vercel serverless deployment
export default app;
  