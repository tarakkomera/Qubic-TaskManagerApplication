# ⚡ Qubic Task Manager Application

Qubic is a full-stack, enterprise-grade task management platform built with the MERN stack. Designed with a sleek, high-performance "Cyber-Noir" aesthetic, it streamlines organizational workflows by offering role-based task delegation, a Kanban-style interactive board, and a gamified reward points system to boost productivity.

---

## 🌟 Key Features

### 🔐 Robust Authentication & Security
- **Role-Based Access Control (RBAC):** Distinct permissions for Admin, HR, and Staff users.
- **Email Verification:** OTP-based verification required for all new user registrations to ensure data integrity.
- **Password Recovery:** Secure "Forgot Password" workflow via OTP email resets.
- **JWT Sessions:** Stateless, secure JSON Web Token authentication.

### 📋 Interactive Task Management
- **Kanban Board:** Drag-and-drop interactive boards tailored by role. 
  - *Admins/HR* can manage the entire workflow.
  - *Staff* can claim tasks from the "Unclaimed" pool and track their active progress.
- **Soft Deletion:** Safe 10-second "Undo" window for deleted tasks to prevent accidental data loss.
- **Detailed Analytics:** Visual dashboards for tracking organizational statistics, completion rates, and recent activity.

### 🎮 Gamified Productivity
- **Reward Points System:** Staff earn programmable reward points upon successfully completing assigned or claimed tasks.
- **Performance Tracking:** Real-time visibility of accumulated points integrated into user profiles.

### 📧 Real-time Asynchronous Notifications
- **Automated Emails:** Background dispatching for OTPs, verifications, and administrative password resets via Nodemailer (Gmail SMTP integration).

---

## 🛠️ Technology Stack

**Frontend (Client)**
- **Framework:** React.js (via Vite)
- **Styling:** Tailwind CSS (Modern Glassmorphism & Cyber-Noir aesthetics)
- **Routing:** React Router DOM (v6)
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Notifications:** React Toastify
- **Deployment:** Vercel

**Backend (Server)**
- **Environment:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose ODM) & MongoDB Atlas
- **Security:** bcrypt (password hashing), JWT (authentication)
- **Mail Service:** Nodemailer
- **Deployment:** Render (or any Node-compatible cloud provider)

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB account (Atlas) or local MongoDB server
- A Gmail account with an "App Password" generated for email notifications.

### 2. Clone and Install
1. Clone the repository.
2. Install dependencies for both ends:
   ```bash
   cd backend
   npm install
   
   cd ../frontend
   npm install
   ```

### 3. Environment Variables
Create a `.env` file in the **backend** directory:
```env
PORT=4000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_16_digit_gmail_app_password
```

Create a `.env` file in the **frontend** directory:
```env
VITE_API_URL=http://localhost:4000
```

### 4. Run the Application
Start the backend server:
```bash
cd backend
npm start
```

Start the frontend development server:
```bash
cd frontend
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 🌐 Production Deployment Architecture

- **Frontend on Vercel:** Built using Vite. The `vercel.json` ensures that single-page application (SPA) client-side routing works seamlessly across all paths without triggering 404 errors.
- **Backend on Render:** The REST API handles all processing asynchronously (including non-blocking email dispatches) ensuring instant UI responses.
- **Database:** Hosted on MongoDB Atlas for scalable, cloud-based data persistence.

*(Note: If hosting the backend on a free-tier service like Render, a cron job setup is recommended to prevent the server from sleeping during inactivity).*

---

## 📝 License
© Qubic Task Manager. All rights reserved. Built for modern productivity.
