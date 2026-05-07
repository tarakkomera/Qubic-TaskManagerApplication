import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { createTask, getTasks, getTaskById, updateTask, deleteTask, claimTask } from '../controllers/taskController.js';

const taskRouter = express.Router();

taskRouter.route('/gp')
    .get(authMiddleware, getTasks)
    .post(authMiddleware, createTask);

taskRouter.route('/:id/gp')
    .get(authMiddleware, getTaskById)
    .put(authMiddleware, updateTask)
    .delete(authMiddleware, deleteTask);

// Staff: claim an unclaimed task
taskRouter.patch('/:id/claim', authMiddleware, claimTask);

export default taskRouter;