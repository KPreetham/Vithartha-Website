import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Use user email if available, otherwise 'admin' or general
        // multer-storage-cloudinary provides req to this param function
        const userFolder = req.user?.role === 'admin' 
            ? 'admin_uploads' 
            : (req.user?.email ? `${req.user.email}` : 'vithartha_general');
            
        return {
            folder: `vithartha_documents/${userFolder}`,
            allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx'],
            resource_type: 'auto',
            // Sanitizing public_id: use timestamp + original name (without spaces)
            public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/\s+/g, '_')}`
        };
    },
});

export { cloudinary, storage };
