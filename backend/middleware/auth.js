import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

export default async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];

    try {
        const playload = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(playload.id).select('-password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.log("JWT Verification failed:", error);
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}