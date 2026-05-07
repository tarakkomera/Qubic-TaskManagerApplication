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

const userModel = mongoose.models.user || mongoose.model('User', userSchema);
export default userModel;