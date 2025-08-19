import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'pamventory/products', // Folder in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Allowed image formats
        transformation: [
            { width: 800, height: 600, crop: 'limit' }, // Resize images
            { quality: 'auto' }, // Auto quality optimization
            { fetch_format: 'auto' } // Auto format optimization
        ],
        public_id: (req, file) => {
            // Generate unique public_id
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            return `product_${timestamp}_${random}`;
        },
    },
});

// Create multer upload middleware
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
});

// Helper function to delete image from Cloudinary
export const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

// Helper function to extract public_id from Cloudinary URL
export const extractPublicId = (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
        return null;
    }
    
    try {
        // Extract public_id from URL
        const urlParts = imageUrl.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex === -1) return null;
        
        // Get the part after version (if exists) or after upload
        let publicIdPart = urlParts.slice(uploadIndex + 1).join('/');
        
        // Remove version if exists (starts with v followed by numbers)
        publicIdPart = publicIdPart.replace(/^v\d+\//, '');
        
        // Remove file extension
        const lastDotIndex = publicIdPart.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            publicIdPart = publicIdPart.substring(0, lastDotIndex);
        }
        
        return publicIdPart;
    } catch (error) {
        console.error('Error extracting public_id:', error);
        return null;
    }
};

export default cloudinary;