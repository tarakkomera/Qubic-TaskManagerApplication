import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'emails.log');

const logEmailLocally = (type, recipient, content) => {
  const entry = `
==============================================
📧 ${type} to: ${recipient}
Date: ${new Date().toLocaleString()}
Content: ${content}
==============================================
`;
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`\n📬 [LOCAL LOG] ${type} for ${recipient} has been recorded in emails.log`);
};

// ─── Create reusable transporter using Gmail SMTP ─────────────────────────────
const createTransporter = () => {
  // Debug: Check if variables are loaded
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ WARNING: EMAIL_USER or EMAIL_PASS is not defined in .env file');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS?.replace(/\s/g, ''),
    },
  });
};

// Verify connection configuration on startup
const transporter = createTransporter();
transporter.verify((error, success) => {
  if (error) {
    console.error(' SMTP Connection Error:', error.message);
    console.log(' Current EMAIL_USER:', process.env.EMAIL_USER);
    console.log(' Make sure you use a 16-digit Gmail App Password (no spaces).');
  } else {
    console.log(' SMTP Server is ready to send "real" emails');
  }
});

// ─── Send Email Verification OTP ─────────────────────────────────────────────
export const sendVerificationEmail = async (userEmail, code) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Qubic App" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: ' Verify Your Qubic Account',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #14b8a6, #06b6d4, #3b82f6); padding: 32px 40px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">⚡ Qubic</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Task Management Platform</p>
          </div>

          <!-- Body -->
          <div style="padding: 36px 40px;">
            <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #f1f5f9;">Verify Your Email Address</h2>
            <p style="margin: 0 0 28px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
              Thanks for registering! Use the 6-digit code below to verify your account. This code expires in <strong style="color: #f1f5f9;">10 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <div style="background: #1e293b; border: 2px solid #06b6d4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
              <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #64748b;">Your Verification Code</p>
              <p style="margin: 0; font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #22d3ee; font-family: 'Courier New', monospace;">${code}</p>
            </div>

            <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
              If you didn't create an account on Qubic, you can safely ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 40px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #475569;">© ${new Date().getFullYear()} Qubic Task Manager. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(` Verification email sent to: ${userEmail}`);
    logEmailLocally('VERIFICATION OTP', userEmail, `Verification Code: ${code}`);
    return true;
  } catch (error) {
    console.error(' Failed to send verification email:', error.message);
    // Even if it fails, log it locally so the user can see the code and continue testing
    logEmailLocally('VERIFICATION OTP (REAL SEND FAILED)', userEmail, `Verification Code: ${code} \nError: ${error.message}`);
    return true; // Return true so the frontend doesn't show an error, allowing user to use the code from the log
  }
};

// ─── Send Password Reset Notification ────────────────────────────────────────
export const sendPasswordChangeEmail = async (userEmail, newPassword) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Qubic App" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: ' Your Qubic Password Has Been Reset',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #14b8a6, #06b6d4, #3b82f6); padding: 32px 40px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">⚡ Qubic</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Task Management Platform</p>
          </div>

          <!-- Body -->
          <div style="padding: 36px 40px;">
            <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #f1f5f9;">Password Reset Notice</h2>
            <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
              Your administrator has reset your account password. Your new temporary credentials are below.
            </p>

            <!-- Password Box -->
            <div style="background: #1e293b; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #64748b;">New Temporary Password</p>
              <p style="margin: 0; font-size: 22px; font-weight: 800; color: #fbbf24; font-family: 'Courier New', monospace;">${newPassword}</p>
            </div>

            <p style="margin: 0; font-size: 13px; color: #ef4444; font-weight: 600;">⚠️ Please log in and change this password immediately from your Profile Settings.</p>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 40px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #475569;">© ${new Date().getFullYear()} Qubic Task Manager. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(` Password reset email sent to: ${userEmail}`);
    logEmailLocally('PASSWORD RESET', userEmail, `New Password: ${newPassword}`);
    return true;
  } catch (error) {
    console.error(' Failed to send password reset email:', error.message);
    logEmailLocally('PASSWORD RESET (REAL SEND FAILED)', userEmail, `New Password: ${newPassword} \nError: ${error.message}`);
    return true;
  }
};

// ─── Send Forgot Password Code ───────────────────────────────────────────────
export const sendForgotPasswordEmail = async (userEmail, code) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Qubic App" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: ' Reset Your Qubic Password',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
          
          <div style="background: linear-gradient(135deg, #f43f5e, #fb923c); padding: 32px 40px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">⚡ Qubic</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Password Recovery</p>
          </div>

          <div style="padding: 36px 40px;">
            <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #f1f5f9;">Reset Your Password</h2>
            <p style="margin: 0 0 28px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
              We received a request to reset your password. Use the 6-digit code below to set a new password. This code expires in <strong style="color: #f1f5f9;">10 minutes</strong>.
            </p>

            <div style="background: #1e293b; border: 2px solid #fb923c; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
              <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #64748b;">Your Reset Code</p>
              <p style="margin: 0; font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #fb923c; font-family: 'Courier New', monospace;">${code}</p>
            </div>

            <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
              If you did not request this, you can safely ignore this email and your password will remain unchanged.
            </p>
          </div>

          <div style="padding: 20px 40px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #475569;">© ${new Date().getFullYear()} Qubic Task Manager. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(` Forgot Password email sent to: ${userEmail}`);
    logEmailLocally('FORGOT PASSWORD OTP', userEmail, `Reset Code: ${code}`);
    return true;
  } catch (error) {
    console.error(' Failed to send forgot password email:', error.message);
    logEmailLocally('FORGOT PASSWORD OTP (REAL SEND FAILED)', userEmail, `Reset Code: ${code} \nError: ${error.message}`);
    return true;
  }
};
