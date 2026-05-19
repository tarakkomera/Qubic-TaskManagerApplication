import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'hr', 'staff'],
        default: 'staff',
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    department: {
        type: String,
        default: '',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationCode: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },
    resetPasswordToken: {
        type: String,
        default: null,
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    points: {
        type: Number,
        default: 0,
    },
    assignedHR: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
});

// Indexes for production query performance
// Note: email index is already created by unique:true in the schema
userSchema.index({ role: 1, isApproved: 1 });         // Fast HR/staff queries
userSchema.index({ assignedHR: 1 });                  // Fast team count queries

const userModel = mongoose.models.user || mongoose.model('User', userSchema);
export default userModel;