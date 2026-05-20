import User from "../models/userModel.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendPasswordChangeEmail, sendVerificationEmail, sendForgotPasswordEmail, verifySMTP, sendTestEmail } from "../services/emailService.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
const TOKEN_EXPIRES = '24h';
// Salt rounds: 8 is secure and ~4× faster than 10 on CPU-limited free-tier hosting
const BCRYPT_ROUNDS = 8;

const createToken = (userID) => jwt.sign({ id: userID }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });

export async function registerUser(req, res) {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long and contain at least one uppercase letter and one special character" });
    }

    // Only allow valid roles; default to 'staff'
    let assignedRole = ['admin', 'hr', 'staff'].includes(role) ? role : 'staff';
    let isApproved = false;

    try {
        if (await User.findOne({ email })) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Admin one-time signup logic
        if (assignedRole === 'admin') {
            const adminExists = await User.findOne({ role: 'admin' });
            if (adminExists) {
                return res.status(400).json({ message: "Admin already exists. Only one admin is allowed." });
            }
            // First admin is auto-approved
            isApproved = true;
        }
        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const user = await User.create({
            name,
            email,
            password: hashed,
            role: assignedRole,
            verificationCode,
            otpExpires,
            isApproved
        });

        const emailSent = await sendVerificationEmail(user.email, verificationCode);
        console.log(`🔑 DEBUG: User created with email ${user.email} and code ${verificationCode}`);

        if (!emailSent) {
            return res.status(201).json({ 
                success: true, 
                message: "Registration successful, but we failed to send the verification email. Please log in to resend the code or try again.", 
                email: user.email,
                warning: "Email sending failed" 
            });
        }

        res.status(201).json({ success: true, message: "Registration successful. Please verify your email.", email: user.email });

    } catch (err) {
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }

}


//LOGIN FUNCTION
export async function loginUser(req, res) {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: "Email and Password required" });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (!user.isVerified) {
            // Generate a new code since they are trying to log in but are unverified
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            user.verificationCode = verificationCode;
            user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            await user.save();

            const emailSent = await sendVerificationEmail(user.email, verificationCode);
            
            if (!emailSent) {
                return res.status(403).json({ 
                    message: "Your account is unverified, and we failed to send a verification code email. Please contact an administrator or try again later.", 
                    unverified: true, 
                    email: user.email 
                });
            }
            
            return res.status(403).json({ message: "Please verify your email to login. A new verification code has been sent.", unverified: true, email: user.email });
        }

        if (!user.isApproved) {
            return res.status(403).json({ message: "Your account is pending approval by an administrator/HR.", notApproved: true });
        }

        // HR allocation now happens at approval time only (see toggleUserApproval)
        // This avoids expensive N+1 queries on every login

        const token = createToken(user._id);
        res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, points: user.points } });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

//Get current user
export async function getCurrentUser(req, res) {
    try {
        const user = await User.findById(req.user.id).select("-password").populate('assignedHR', 'name email');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}



//Update user profile
export async function updateUserProfile(req, res) {
    const { name, email } = req.body;

    // Validate input
    if (!name || !email || !validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: " Valid Name and Email are required" });
    }

    try {
        const exists = await User.findOne({ email, _id: { $ne: req.user.id } });
        if (exists) {
            return res.status(404).json({ success: false, message: "Email already exist" });
        }
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, email },
            { new: true, runValidators: true, select: "name email" }
        );
        res.json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

//change user password

export async function updateUserPassword(req, res) {
    const { currentPassword, newPassword } = req.body;

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!currentPassword || !newPassword || !passwordRegex.test(newPassword)) {
        return res.status(400).json({ success: false, message: "New password must be at least 8 characters long and contain at least one uppercase letter and one special character." });
    }

    try {
        const user = await User.findById(req.user.id).select("password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Current password is incorrect" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        user.password = hashedNewPassword;
        await user.save();

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

// Get all users (Admin/HR only)
export async function getAllUsers(req, res) {
    try {
        // Exclude passwords from the returned data
        const users = await User.find().select("-password").populate('assignedHR', 'name email');
        res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

// Reset user password by Admin/HR
export async function adminResetPassword(req, res) {
    const { newPassword } = req.body;
    const userId = req.params.id;

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!newPassword || !passwordRegex.test(newPassword)) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long and contain at least one uppercase letter and one special character." });
    }

    try {
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        targetUser.password = hashedNewPassword;
        await targetUser.save();

        // Send email notification to the user
        await sendPasswordChangeEmail(targetUser.email, newPassword);

        res.json({ success: true, message: "Password reset successfully. User has been notified via email." });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

// Verify Email Code
export async function verifyEmail(req, res) {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ success: false, message: "Email and verification code are required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (user.isVerified) return res.status(400).json({ success: false, message: "User is already verified" });

        // Check if OTP is expired
        if (user.otpExpires && new Date() > user.otpExpires) {
            return res.status(400).json({ success: true, message: "Verification code has expired. Please request a new one.", expired: true });
        }

        if (user.verificationCode !== code.trim()) {
            return res.status(400).json({ success: false, message: "Invalid verification code" });
        }

        user.isVerified = true;
        user.verificationCode = null;
        user.otpExpires = null;
        await user.save();

        res.status(200).json({ success: true, message: "Email verified successfully. You can now login." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

// Resend OTP for Email Verification
export async function resendVerificationEmail(req, res) {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.isVerified) return res.status(400).json({ success: false, message: "User is already verified" });

        // Generate new 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = verificationCode;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Reset expiry to 10 mins
        await user.save();

        const emailSent = await sendVerificationEmail(user.email, verificationCode);
        if (!emailSent) {
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send the verification email. Please verify that your SMTP/mail credentials are set up correctly on the server." 
            });
        }
        res.status(200).json({ success: true, message: "Verification code resent successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

// Approve or Deny User
export async function toggleUserApproval(req, res) {
    const { userId, approve } = req.body; // approve is a boolean

    try {
        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check permissions: Admin can approve anyone. HR can only approve staff.
        if (req.user.role === 'hr' && userToUpdate.role !== 'staff') {
            return res.status(403).json({ success: false, message: "HR can only approve Staff members." });
        }

        userToUpdate.isApproved = approve;

        // Automatic HR allocation on approval for Staff
        if (approve && userToUpdate.role === 'staff' && !userToUpdate.assignedHR) {
            // Prioritize the approving HR if they have room (< 10)
            if (req.user.role === 'hr') {
                const myTeamCount = await User.countDocuments({ assignedHR: req.user._id });
                if (myTeamCount < 10) {
                    userToUpdate.assignedHR = req.user._id;
                }
            }

            // If still not assigned (Admin approved or HR was full), find another available HR
            if (!userToUpdate.assignedHR) {
                const hrs = await User.find({ role: 'hr', isApproved: true });
                for (const hr of hrs) {
                    const count = await User.countDocuments({ assignedHR: hr._id });
                    if (count < 10) {
                        userToUpdate.assignedHR = hr._id;
                        break;
                    }
                }
            }
        }

        await userToUpdate.save();

        res.status(200).json({
            success: true,
            message: `User ${approve ? 'approved' : 'denied'} successfully.`,
            user: { id: userToUpdate._id, name: userToUpdate.name, role: userToUpdate.role, isApproved: userToUpdate.isApproved }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

export const assignHRToStaff = async (req, res) => {
    try {
        const { userId, hrId } = req.body;
        const targetStaff = await User.findById(userId);

        if (!targetStaff) {
            return res.status(404).json({ success: false, message: "Staff member not found" });
        }

        // Permissions: Admin can assign anyone to any HR. HR can only "claim" staff (assign to self).
        const finalHrId = req.user.role === 'admin' ? hrId : req.user._id;

        if (req.user.role === 'hr' && hrId && hrId !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "HR can only assign staff to themselves." });
        }

        if (finalHrId) {
            const hrManager = await User.findById(finalHrId);
            if (!hrManager || hrManager.role !== 'hr') {
                return res.status(400).json({ success: false, message: "Invalid HR manager" });
            }

            // Check team capacity (max 10)
            const teamCount = await User.countDocuments({ assignedHR: finalHrId });
            if (teamCount >= 10 && targetStaff.assignedHR?.toString() !== finalHrId) {
                return res.status(400).json({ success: false, message: "This HR team is already at maximum capacity (10)." });
            }

            targetStaff.assignedHR = finalHrId;
        } else {
            // Unassign
            targetStaff.assignedHR = null;
        }

        await targetStaff.save();

        res.status(200).json({
            success: true,
            message: finalHrId ? "Staff assigned successfully" : "Staff unallocated successfully",
            user: targetStaff
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Forgot Password - Send OTP
export async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with that email address." });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordToken = resetCode;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        const emailSent = await sendForgotPasswordEmail(user.email, resetCode);

        if (!emailSent) {
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send the password recovery email. Please verify that your SMTP/mail credentials are set up correctly on the server." 
            });
        }

        res.status(200).json({ success: true, message: "If that email exists, a reset code has been sent." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

// Reset Password - Verify OTP and Change Password
export async function resetPassword(req, res) {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
        return res.status(400).json({ success: false, message: "Email, code, and new password are required" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long and contain at least one uppercase letter and one special character." });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
            return res.status(400).json({ success: false, message: "Reset code has expired. Please request a new one." });
        }

        if (user.resetPasswordToken !== code.trim()) {
            return res.status(400).json({ success: false, message: "Invalid reset code" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        user.password = hashedNewPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({ success: true, message: "Password has been successfully reset. You can now log in." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

// SMTP Diagnostics Endpoint
export async function testSMTPConnection(req, res) {
    const toEmail = req.query.email || process.env.EMAIL_USER;

    try {
        console.log(`🧪 Running live SMTP test to: ${toEmail}...`);
        
        // 1. Verify SMTP connection settings
        await verifySMTP();
        
        // 2. Try sending test email
        if (toEmail) {
            await sendTestEmail(toEmail);
            return res.status(200).json({
                success: true,
                message: `SMTP test passed! Test email sent successfully to ${toEmail}.`,
                config: {
                    EMAIL_USER: process.env.EMAIL_USER,
                    EMAIL_PASS_CONFIGURED: !!process.env.EMAIL_PASS
                }
            });
        }

        res.status(200).json({
            success: true,
            message: "SMTP settings are valid! (No test email sent because target email is empty).",
            config: {
                EMAIL_USER: process.env.EMAIL_USER,
                EMAIL_PASS_CONFIGURED: !!process.env.EMAIL_PASS
            }
        });
    } catch (error) {
        console.error("❌ SMTP Diagnostics Failed:", error.message);
        res.status(500).json({
            success: false,
            message: "SMTP Diagnostics Failed. Please verify your environment variables.",
            error: error.message,
            config: {
                EMAIL_USER: process.env.EMAIL_USER || "NOT FOUND",
                EMAIL_PASS_CONFIGURED: !!process.env.EMAIL_PASS
            }
        });
    }
}