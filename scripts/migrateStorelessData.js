import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';

dotenv.config();

const migrateStorelessData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find users without stores
    const usersWithoutStores = await User.find({
      $or: [
        { stores: { $exists: false } },
        { stores: { $size: 0 } }
      ]
    });

    console.log(`Found ${usersWithoutStores.length} users without stores`);

    for (const user of usersWithoutStores) {
      try {
        console.log(`Processing user: ${user.email}`);

        // Check if user has any data (products, sales, customers)
        const hasProducts = await Product.findOne({ userId: user._id });
        const hasSales = await Sale.findOne({ userId: user._id });
        const hasCustomers = await Customer.findOne({ userId: user._id });

        if (hasProducts || hasSales || hasCustomers) {
          console.log(`User ${user.email} has existing data - creating store to preserve it`);
          
          // Create a default store for users with existing data
          const defaultStore = new Store({
            name: `${user.name}'s Store`,
            description: 'Default store created during migration to preserve existing data',
            userId: user._id,
            isActive: true
          });

          await defaultStore.save();

          // Update user with store information
          user.stores = [defaultStore._id];
          user.activeStoreId = defaultStore._id;
          await user.save();

          // Migrate existing data to use the new store
          if (hasProducts) {
            await Product.updateMany(
              { userId: user._id },
              { $set: { storeId: defaultStore._id } }
            );
            console.log(`Migrated products for user ${user.email}`);
          }

          if (hasSales) {
            await Sale.updateMany(
              { userId: user._id },
              { $set: { storeId: defaultStore._id } }
            );
            console.log(`Migrated sales for user ${user.email}`);
          }

          if (hasCustomers) {
            await Customer.updateMany(
              { userId: user._id },
              { $set: { storeId: defaultStore._id } }
            );
            console.log(`Migrated customers for user ${user.email}`);
          }

        } else {
          console.log(`User ${user.email} has no existing data - creating empty store`);
          
          // Create a default store for users without data
          const defaultStore = new Store({
            name: `${user.name}'s Store`,
            description: 'Default store created during migration',
            userId: user._id,
            isActive: true
          });

          await defaultStore.save();

          // Update user with store information
          user.stores = [defaultStore._id];
          user.activeStoreId = defaultStore._id;
          await user.save();
        }

        console.log(`Successfully processed user: ${user.email}`);
      } catch (error) {
        console.error(`Failed to process user ${user.email}:`, error.message);
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateStorelessData();
}

export default migrateStorelessData;
