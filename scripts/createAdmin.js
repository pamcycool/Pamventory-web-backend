import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pamventory');
    console.log('Connected to MongoDB');

    const adminEmail = 'Francismission61@gmail.com';
    const adminPassword = 'PamVentory$312';
    const adminName = 'Admin';

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      // Update existing user to admin
      admin.role = 'Admin';
      admin.isVerified = true;
      admin.name = adminName;
      admin.password = adminPassword; // Will be hashed by pre-save hook
      admin.authMethod = 'email';
      await admin.save();
      console.log('✅ Existing user updated to Admin role');
    } else {
      // Create new admin user
      admin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'Admin',
        isVerified: true,
        authMethod: 'email',
        lastLogin: new Date()
      });
      await admin.save();
      console.log('✅ New Admin user created');
    }

    console.log(`\nAdmin Credentials:`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ${admin.role}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdminUser();
