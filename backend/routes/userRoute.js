import express from 'express';
import { getCurrentUser, loginUser, registerUser, updateUserPassword, updateUserProfile, getAllUsers, adminResetPassword, verifyEmail, toggleUserApproval, resendVerificationEmail, assignHRToStaff, forgotPassword, resetPassword, testSMTPConnection } from '../controllers/userController.js';

import authMiddleware from '../middleware/auth.js';
import hrMiddleware from '../middleware/hrMiddleware.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/verify', verifyEmail);
userRouter.post('/resend-otp', resendVerificationEmail);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPassword);
userRouter.get('/test-email', testSMTPConnection);


userRouter.get('/me', authMiddleware, getCurrentUser);
userRouter.put('/profile', authMiddleware, updateUserProfile);
userRouter.put('/password', authMiddleware, updateUserPassword);

// HR/Admin Routes
userRouter.get('/', authMiddleware, hrMiddleware, getAllUsers);
userRouter.put('/:id/reset-password', authMiddleware, hrMiddleware, adminResetPassword);
userRouter.post('/approve', authMiddleware, hrMiddleware, toggleUserApproval);
userRouter.put('/:id/assign-hr', authMiddleware, hrMiddleware, assignHRToStaff);
export default userRouter;