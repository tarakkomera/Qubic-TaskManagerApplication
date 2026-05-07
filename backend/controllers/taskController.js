import Task from "../models/taskModel.js";
import User from "../models/userModel.js";

// ─── Helper ───────────────────────────────────────────────────────────────────
const canManage = (role) => role === 'hr' || role === 'admin';

// ─── HR/Admin: Create a task ──────────────────────────────────────────────────
export const createTask = async (req, res) => {
    try {
        if (!canManage(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only HR or Admin can create tasks' });
        }
        const { title, description, priority, dueDate, rewardPoints } = req.body;
        const task = new Task({
            title,
            description,
            priority,
            dueDate,
            rewardPoints: rewardPoints || 100,
            status: 'unclaimed',
            completed: false,
            owner: req.user._id,
            claimedBy: null,
        });
        const saved = await task.save();
        const populated = await saved.populate('owner', 'name email');
        res.status(201).json({ success: true, message: 'Task created', task: populated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get tasks (role-aware) ───────────────────────────────────────────────────
// Admin/HR → ALL tasks with full claimer info
// Staff    → unclaimed pool + their own claimed tasks
export const getTasks = async (req, res) => {
    try {
        let tasks;
        if (canManage(req.user.role)) {
            tasks = await Task.find({})
                .populate('claimedBy', 'name email department')
                .populate('owner', 'name email')
                .sort({ createdAt: -1 });
        } else {
            // Staff: show unclaimed pool + their own claimed tasks
            tasks = await Task.find({
                $or: [
                    { status: 'unclaimed' },
                    { claimedBy: req.user._id },
                ]
            })
                .populate('claimedBy', 'name email')
                .populate('owner', 'name email')
                .sort({ createdAt: -1 });
        }
        res.status(200).json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Get single task ──────────────────────────────────────────────────────────
export const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('claimedBy', 'name email department')
            .populate('owner', 'name email');

        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        // Staff can only view unclaimed tasks or tasks they claimed
        if (req.user.role === 'staff') {
            const isTheirTask = task.claimedBy?._id.toString() === req.user._id.toString();
            const isUnclaimed = task.status === 'unclaimed';
            if (!isTheirTask && !isUnclaimed) {
                return res.status(403).json({ success: false, message: 'Not your task' });
            }
        }

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Staff: Claim an unclaimed task ──────────────────────────────────────────
export const claimTask = async (req, res) => {
    try {
        if (req.user.role !== 'staff') {
            return res.status(403).json({ success: false, message: 'Only staff can claim tasks' });
        }

        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        if (task.status !== 'unclaimed') {
            return res.status(400).json({ success: false, message: 'Task is already claimed' });
        }

        task.claimedBy = req.user._id;
        task.claimedAt = new Date();
        task.status = 'in-progress';
        await task.save();

        const populated = await task.populate(['claimedBy', 'owner']);
        res.status(200).json({ success: true, message: 'Task claimed successfully', task: populated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Update task ──────────────────────────────────────────────────────────────
// Admin/HR → can update everything on any task
// Staff    → can only update status of tasks they own
export const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        if (req.user.role === 'staff') {
            // Staff can only update their own claimed task's status
            const isOwner = task.claimedBy?.toString() === req.user._id.toString();
            if (!isOwner) {
                return res.status(403).json({ success: false, message: 'You can only update tasks you have claimed' });
            }
            const { status } = req.body;
            if (!['in-progress', 'completed'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }
            task.status = status;
            task.completed = status === 'completed';
            if (task.completed) task.completedAt = new Date();
        } else {
            // HR/Admin can update everything
            const { title, description, priority, dueDate, status, rewardPoints } = req.body;
            if (title) task.title = title;
            if (description) task.description = description;
            if (priority) task.priority = priority;
            if (dueDate) task.dueDate = dueDate;
            if (rewardPoints) task.rewardPoints = rewardPoints;
            if (status) {
                task.status = status;
                task.completed = status === 'completed';
                if (task.completed && !task.completedAt) task.completedAt = new Date();
            }
        }

        // ─── Award Reward Points on Completion ───────────────────────────────
        if (task.status === 'completed' && !task.pointsAwarded && task.claimedBy) {
            const user = await User.findById(task.claimedBy);
            if (user) {
                user.points = (user.points || 0) + (task.rewardPoints || 100);
                await user.save();
                task.pointsAwarded = true;
            }
        }

        await task.save();
        const populated = await task.populate([
            { path: 'claimedBy', select: 'name email department' },
            { path: 'owner', select: 'name email' },
        ]);
        res.status(200).json({ success: true, message: 'Task updated', task: populated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── HR/Admin: Delete a task ──────────────────────────────────────────────────
export const deleteTask = async (req, res) => {
    try {
        if (!canManage(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only HR or Admin can delete tasks' });
        }
        const deleted = await Task.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Task not found' });
        res.status(200).json({ success: true, message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};