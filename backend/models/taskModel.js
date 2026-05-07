import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
    },
    dueDate: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['unclaimed', 'in-progress', 'completed'],
        default: 'unclaimed',
    },
    owner: {
        // HR user who created the task
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    claimedBy: {
        // Staff member who claimed the task (null = available to claim)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    claimedAt: {
        type: Date,
        default: null,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    rewardPoints: {
        type: Number,
        default: 100,
    },
    pointsAwarded: {
        type: Boolean,
        default: false,
    },
});

const Task = mongoose.model('Task', taskSchema);
export default Task;