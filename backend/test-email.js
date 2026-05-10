import nodemailer from 'nodemailer';
import 'dotenv/config';

async function testEmail() {
  console.log('--- Email Connection Test ---');
  console.log('Checking .env variables...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || ' NOT FOUND');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? ' FOUND (Hidden for security)' : ' NOT FOUND');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('\n ERROR: Missing credentials in .env file.');
    return;
  }

  // Remove spaces from password just in case
  const cleanPass = process.env.EMAIL_PASS.replace(/\s/g, '');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: cleanPass,
    },
  });

  console.log('\nConnecting to Gmail SMTP...');
  
  try {
    await transporter.verify();
    console.log(' Success: Connection established!');

    console.log('\nSending test email...');
    await transporter.sendMail({
      from: `"Qubic Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: ' Qubic Email Test',
      text: 'If you are reading this, your email configuration is working perfectly!',
    });
    console.log(' Success: Test email sent to ' + process.env.EMAIL_USER);
    console.log('\nNow your app should work "in real"! Go back and try registering.');

  } catch (error) {
    console.error('\n SMTP Error:', error.message);
    if (error.message.includes('Username and Password not accepted')) {
      console.log('\n SOLUTION: Your App Password is wrong.');
      console.log('1. Go to https://myaccount.google.com/apppasswords');
      console.log('2. Delete existing passwords and create a NEW one.');
      console.log('3. Copy the 16-character code and update your .env file.');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log('\n SOLUTION: Network Timeout. Check your internet or if your firewall blocks port 465.');
    }
  }
}

testEmail();
