import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // Connection pool settings for production
            maxPoolSize: 10,        // Max connections in the pool
            minPoolSize: 2,         // Keep at least 2 connections warm
            serverSelectionTimeoutMS: 5000,  // Fail fast if DB unreachable
            socketTimeoutMS: 45000,          // Close idle sockets after 45s
            heartbeatFrequencyMS: 10000,     // Check connection health every 10s
        });
        console.log("✅ MongoDB connected successfully");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

export default connectDB;