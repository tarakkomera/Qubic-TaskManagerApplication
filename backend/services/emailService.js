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

// ─── Single shared transporter with connection pooling ───────────────────────
// Reusing one transporter avoids the overhead of a new TCP+TLS handshake per email.
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ WARNING: EMAIL_USER or EMAIL_PASS is not defined in .env file');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    pool: true,              // Enable connection pooling — keeps SMTP connection alive
    maxConnections: 3,       // Max simultaneous connections
    maxMessages: 50,         // Max messages per connection before reconnecting
    rateDelta: 1000,         // Rate limit: 1 second window
    rateLimit: 5,            // Max 5 messages per second
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS?.replace(/\s/g, ''),
    },
    // Connection timeouts to prevent hanging
    connectionTimeout: 10000,  // 10s to establish connection
    greetingTimeout: 10000,    // 10s for SMTP greeting
    socketTimeout: 15000,      // 15s for socket inactivity
  });

  // Non-blocking verification (don't hold up server startup)
  transporter.verify()
    .then(() => console.log('✅ SMTP Server is ready to send emails'))
    .catch((err) => {
      console.error('❌ SMTP Connection Error:', err.message);
      console.log('📧 Current EMAIL_USER:', process.env.EMAIL_USER);
      console.log('💡 Make sure you use a 16-digit Gmail App Password (no spaces).');
      // Reset transporter so next call retries
      transporter = null;
    });

  return transporter;
};

// ─── HTTP API Sender (to bypass Render free-tier SMTP blocks) ────────────────
const sendViaHTTPAPI = async (mailOptions) => {
  // 1. Resend API
  if (process.env.RESEND_API_KEY) {
    console.log('📬 Sending email via Resend HTTP API...');
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Resend API Error: ${data.message || response.statusText}`);
    }
    return true;
  }

  // 2. Brevo (Sendinblue) API
  if (process.env.BREVO_API_KEY) {
    console.log('📬 Sending email via Brevo HTTP API...');
    const senderEmail = process.env.EMAIL_USER || 'qubicapplication@gmail.com';
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Qubic App', email: senderEmail },
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Brevo API Error: ${data.message || response.statusText}`);
    }
    return true;
  }

  // 3. SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    console.log('📬 Sending email via SendGrid HTTP API...');
    const senderEmail = process.env.EMAIL_USER || 'qubicapplication@gmail.com';
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: mailOptions.to }] }],
        from: { email: senderEmail, name: 'Qubic App' },
        subject: mailOptions.subject,
        content: [{ type: 'text/html', value: mailOptions.html }]
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(`SendGrid API Error: ${data.errors?.[0]?.message || response.statusText}`);
    }
    return true;
  }

  return false;
};

// ─── Retry helper with exponential backoff ──────────────────────────────────
const sendWithRetry = async (mailOptions, maxRetries = 3) => {
  // Check if any HTTP API key is configured to bypass SMTP port blocking
  if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await sendViaHTTPAPI(mailOptions);
        return true;
      } catch (error) {
        console.error(`📧 HTTP API attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    return;
  }

  // Fallback to SMTP
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const t = getTransporter();
      if (!t) throw new Error('Transporter not available');
      await t.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error(`📧 SMTP Send attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) {
        // Reset transporter on final failure so next email gets a fresh connection
        transporter = null;
        throw error;
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
};

// ─── Fire-and-forget email sender (non-blocking) ────────────────────────────
// All email functions below return immediately; the actual send happens in the background.
// This prevents email delivery from blocking the HTTP response.

// ─── Send Email Verification OTP ─────────────────────────────────────────────
export const sendVerificationEmail = async (userEmail, code) => {
  const mailOptions = {
    from: `"Qubic App" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🔐 Verify Your Qubic Account',
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

  try {
    await sendWithRetry(mailOptions);
    console.log(`✅ Verification email sent to: ${userEmail}`);
    logEmailLocally('VERIFICATION OTP', userEmail, `Verification Code: ${code}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    logEmailLocally('VERIFICATION OTP (REAL SEND FAILED)', userEmail, `Verification Code: ${code} \nError: ${error.message}`);
    return false;
  }
};

// ─── Send Password Reset Notification ────────────────────────────────────────
export const sendPasswordChangeEmail = async (userEmail, newPassword) => {
  const mailOptions = {
    from: `"Qubic App" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🔑 Your Qubic Password Has Been Reset',
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

  try {
    await sendWithRetry(mailOptions);
    console.log(`✅ Password reset email sent to: ${userEmail}`);
    logEmailLocally('PASSWORD RESET', userEmail, `New Password: ${newPassword}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    logEmailLocally('PASSWORD RESET (REAL SEND FAILED)', userEmail, `New Password: ${newPassword} \nError: ${error.message}`);
    return false;
  }
};

// ─── Send Forgot Password Code ───────────────────────────────────────────────
export const sendForgotPasswordEmail = async (userEmail, code) => {
  const mailOptions = {
    from: `"Qubic App" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🔐 Reset Your Qubic Password',
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

  try {
    await sendWithRetry(mailOptions);
    console.log(`✅ Forgot Password email sent to: ${userEmail}`);
    logEmailLocally('FORGOT PASSWORD OTP', userEmail, `Reset Code: ${code}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send forgot password email:', error.message);
    logEmailLocally('FORGOT PASSWORD OTP (REAL SEND FAILED)', userEmail, `Reset Code: ${code} \nError: ${error.message}`);
    return false;
  }
};

// ─── SMTP Diagnostics for Production ─────────────────────────────────────────
export const verifySMTP = async () => {
  const t = getTransporter();
  if (!t) throw new Error('Transporter not configured or credentials missing');
  await t.verify();
  return true;
};

export const sendTestEmail = async (toEmail) => {
  const t = getTransporter();
  if (!t) throw new Error('Transporter not configured or credentials missing');

  const mailOptions = {
    from: `"Qubic Diagnostics" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🧪 Qubic Live SMTP Test Email',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f1f5f9; border-radius: 8px;">
        <h2 style="color: #22d3ee;">🧪 Live SMTP Test Succeeded!</h2>
        <p>If you are reading this email, your Qubic production SMTP settings are working perfectly in real-time.</p>
        <hr style="border-color: #1e293b;" />
        <p style="font-size: 12px; color: #64748b;">Sent at: ${new Date().toLocaleString()}</p>
      </div>
    `
  };

  await t.sendMail(mailOptions);
  return true;
};
