import nodemailer from 'nodemailer';

// ─── Detect active email transport method ────────────────────────────────────
const getTransportMethod = () => {
  if (process.env.RESEND_API_KEY) return 'Resend HTTP API';
  if (process.env.BREVO_API_KEY) return 'Brevo HTTP API';
  if (process.env.SENDGRID_API_KEY) return 'SendGrid HTTP API';
  return 'Gmail SMTP';
};

// ─── Console OTP Logger ──────────────────────────────────────────────────────
// Always prints OTP codes to console so they can be found in Render's Logs tab
// even if email delivery completely fails. This is the ultimate safety net.
const logOTPToConsole = (type, recipient, code) => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  📧 ${type}
║  To: ${recipient}
║  Code: ${code}
║  Time: ${new Date().toISOString()}
║  Transport: ${getTransportMethod()}
╚══════════════════════════════════════════════════╝
`);
};

// ─── Single shared transporter (SMTP fallback only) ──────────────────────────
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set — SMTP will not work');
    return null;
  }

  const isServerless = !!process.env.VERCEL;

  try {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      pool: !isServerless,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 1000,
      rateLimit: 5,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s/g, ''),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  } catch (err) {
    console.error('❌ Failed to create SMTP transporter:', err.message);
    transporter = null;
    return null;
  }

  return transporter;
};

// ─── HTTP API Sender (bypasses Render SMTP port blocks) ──────────────────────
const sendViaHTTPAPI = async (mailOptions) => {
  // 1. Resend API
  if (process.env.RESEND_API_KEY) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    console.log(`📬 Resend API → from: ${fromAddress}, to: ${mailOptions.to}`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Resend API Error (${response.status}): ${data.message || response.statusText}`);
    }
    console.log('✅ Resend API sent successfully, id:', data.id);
    return true;
  }

  // 2. Brevo (Sendinblue) API
  if (process.env.BREVO_API_KEY) {
    const senderEmail = process.env.EMAIL_USER || 'qubicapplication@gmail.com';
    console.log(`📬 Brevo API → from: ${senderEmail}, to: ${mailOptions.to}`);
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
      throw new Error(`Brevo API Error (${response.status}): ${data.message || response.statusText}`);
    }
    return true;
  }

  // 3. SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    const senderEmail = process.env.EMAIL_USER || 'qubicapplication@gmail.com';
    console.log(`📬 SendGrid API → from: ${senderEmail}, to: ${mailOptions.to}`);
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
      throw new Error(`SendGrid API Error (${response.status}): ${data.errors?.[0]?.message || response.statusText}`);
    }
    return true;
  }

  return false;
};

// ─── Send with retry + automatic HTTP/SMTP routing ──────────────────────────
const sendWithRetry = async (mailOptions, maxRetries = 2) => {
  const hasHTTPAPI = process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY;

  // Try HTTP API first (works on Render free-tier where SMTP is blocked)
  if (hasHTTPAPI) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await sendViaHTTPAPI(mailOptions);
        if (result) return true;
      } catch (error) {
        console.error(`📧 HTTP API attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Fallback to SMTP (only works if SMTP ports are not blocked)
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const t = getTransporter();
      if (!t) throw new Error('SMTP transporter not available — EMAIL_USER/EMAIL_PASS missing');
      await t.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error(`📧 SMTP attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) {
        transporter = null; // Reset so next call gets a fresh connection
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// ─── Send Verification Email ─────────────────────────────────────────────────
export const sendVerificationEmail = async (userEmail, code) => {
  // ALWAYS log the code to console — safety net for Render logs
  logOTPToConsole('VERIFICATION CODE', userEmail, code);

  const mailOptions = {
    from: `"Qubic App" <${process.env.EMAIL_USER || 'noreply@qubic.app'}>`,
    to: userEmail,
    subject: '🔐 Verify Your Qubic Account',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #14b8a6, #06b6d4, #3b82f6); padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">⚡ Qubic</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Task Management Platform</p>
        </div>
        <div style="padding: 36px 40px;">
          <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #f1f5f9;">Verify Your Email Address</h2>
          <p style="margin: 0 0 28px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
            Thanks for registering! Use the 6-digit code below to verify your account. This code expires in <strong style="color: #f1f5f9;">10 minutes</strong>.
          </p>
          <div style="background: #1e293b; border: 2px solid #06b6d4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #64748b;">Your Verification Code</p>
            <p style="margin: 0; font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #22d3ee; font-family: 'Courier New', monospace;">${code}</p>
          </div>
          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
            If you didn't create an account on Qubic, you can safely ignore this email.
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
    console.log(`✅ Verification email sent to: ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${userEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ─── Send Password Change Notification ───────────────────────────────────────
export const sendPasswordChangeEmail = async (userEmail, newPassword) => {
  logOTPToConsole('PASSWORD RESET', userEmail, newPassword);

  const mailOptions = {
    from: `"Qubic App" <${process.env.EMAIL_USER || 'noreply@qubic.app'}>`,
    to: userEmail,
    subject: '🔑 Your Qubic Password Has Been Reset',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #14b8a6, #06b6d4, #3b82f6); padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">⚡ Qubic</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Task Management Platform</p>
        </div>
        <div style="padding: 36px 40px;">
          <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #f1f5f9;">Password Reset Notice</h2>
          <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
            Your administrator has reset your account password. Your new temporary credentials are below.
          </p>
          <div style="background: #1e293b; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #64748b;">New Temporary Password</p>
            <p style="margin: 0; font-size: 22px; font-weight: 800; color: #fbbf24; font-family: 'Courier New', monospace;">${newPassword}</p>
          </div>
          <p style="margin: 0; font-size: 13px; color: #ef4444; font-weight: 600;">⚠️ Please log in and change this password immediately from your Profile Settings.</p>
        </div>
        <div style="padding: 20px 40px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #475569;">© ${new Date().getFullYear()} Qubic Task Manager. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await sendWithRetry(mailOptions);
    console.log(`✅ Password reset email sent to: ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${userEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ─── Send Forgot Password Code ───────────────────────────────────────────────
export const sendForgotPasswordEmail = async (userEmail, code) => {
  // ALWAYS log the code to console — safety net for Render logs
  logOTPToConsole('FORGOT PASSWORD CODE', userEmail, code);

  const mailOptions = {
    from: `"Qubic App" <${process.env.EMAIL_USER || 'noreply@qubic.app'}>`,
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
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send forgot password email to ${userEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ─── Email Transport Diagnostics ─────────────────────────────────────────────
export const verifySMTP = async () => {
  // If HTTP API is configured, SMTP verify is irrelevant (Render blocks SMTP ports)
  if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY) {
    console.log(`✅ Using ${getTransportMethod()} — SMTP verify skipped`);
    return true;
  }

  const t = getTransporter();
  if (!t) throw new Error('SMTP transporter not available — EMAIL_USER/EMAIL_PASS missing');
  await t.verify();
  return true;
};

export const sendTestEmail = async (toEmail) => {
  const method = getTransportMethod();
  const mailOptions = {
    from: `"Qubic Diagnostics" <${process.env.EMAIL_USER || 'noreply@qubic.app'}>`,
    to: toEmail,
    subject: '🧪 Qubic Live Email Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f1f5f9; border-radius: 8px;">
        <h2 style="color: #22d3ee;">🧪 Live Email Test Succeeded!</h2>
        <p>If you are reading this email, your Qubic production email settings are working perfectly.</p>
        <hr style="border-color: #1e293b;" />
        <p style="font-size: 12px; color: #64748b;">Sent at: ${new Date().toISOString()}</p>
        <p style="font-size: 12px; color: #64748b;">Method: ${method}</p>
      </div>
    `
  };

  try {
    await sendWithRetry(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Re-export for diagnostics
export { getTransportMethod };
