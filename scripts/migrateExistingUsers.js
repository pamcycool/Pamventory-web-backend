import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Store from '../models/Store.js';

dotenv.config();

const migrateExistingUsers = async () => {
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
        // Create a default store for each user
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

        console.log(`Created default store for user: ${user.email}`);
      } catch (error) {
        console.error(`Failed to create store for user ${user.email}:`, error.message);
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
// if (import.meta.url === `file://${process.argv[1]}`) {
//   migrateExistingUsers();
// }

export default migrateExistingUsers;
