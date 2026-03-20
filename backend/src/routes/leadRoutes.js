import express from 'express';
import { createLead, getLeads, getLeadById, updateLead, updateDocumentStatus } from '../controllers/leadController.js';
import { protect } from '../middleware/authMiddleware.js';

import multer from 'multer';
import { storage } from '../config/cloudinary.js';

const upload = multer({ storage });

const router = express.Router();

router.post('/upload', protect, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    
    // Cloudinary returns the secure URL in req.file.path or req.file.secure_url depending on version/config
    // multer-storage-cloudinary usually puts it in req.file.path
    const url = req.file.path;
    res.status(200).json({ success: true, url, filename: req.file.filename });
});

router.post('/', createLead);
router.get('/', getLeads);
router.get('/:id', getLeadById);
router.patch('/:id', updateLead);
router.patch('/:leadId/documents/:docId', updateDocumentStatus);

export default router;
