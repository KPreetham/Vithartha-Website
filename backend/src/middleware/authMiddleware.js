import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            const authHeader = req.headers.authorization;
            if (authHeader.includes(' ')) {
                token = authHeader.split(' ')[1];
            } else {
                return res.status(401).json({ message: 'Malformed Authorization header' });
            }

            if (!token || token === 'undefined' || token === 'null') {
                return res.status(401).json({ message: 'Token is invalid or missing' });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            return next();
        } catch (error) {
            console.error('JWT Verification Error:', error.message);
            return res.status(401).json({ 
                message: 'Not authorized', 
                detail: error.message 
            });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};
