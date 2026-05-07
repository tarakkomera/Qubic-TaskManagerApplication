import express from 'express';
import path from 'path';
import cors from 'cors';
import connectDB from './config/db.js';
import 'dotenv/config'
import userRouter from './routes/userRoute.js';
import taskRouter from './routes/taskRoute.js';
const app = express();
const PORT = process.env.PORT || 4000;


//MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//dbconnection
connectDB();

//ROUTES
app.use('/api/users', userRouter);
app.use('/api/tasks', taskRouter);


app.get('/', (req, res) => {
    res.send('Welcome to the Qubic API');
})


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 