import express from "express";
import { Resend } from "resend";

const verifyOtp = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// Send OTP
verifyOtp.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const redis = req.app.locals.redis;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis for 5 minutes
    await redis.setEx(`otp:${email}`, 300, otp);

    // Send email with Resend
    await resend.emails.send({
      from: "no-reply@otpalllinks.linphasetechnology.com",
      to: email,
      subject: "Verify your Email",
      html: `
                <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 50px auto; background-color: #fff; border-radius: 10px; padding: 30px; text-align: center; }
        .otp { font-size: 32px; font-weight: bold; color: #1a73e8; letter-spacing: 5px; margin: 20px 0; }
        .footer { font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Verify Your Email</h1>
        <p>Use the following OTP to complete your verification:</p>
        <div class="otp">${otp}</div>
        <p class="footer">This OTP is valid for 5 minutes. If you didn't request this, please ignore this email.</p>
      </div>
    </body>
    </html>
      `
    });

    return res
      .status(200)
      .json({ message: "OTP sent to email successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err.message, err);
    return res
      .status(500)
      .json({ message: "Failed to send OTP", error: err.message });
  }
});

// Verify OTP
verifyOtp.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const redis = req.app.locals.redis;

    const storedOtp = await redis.get(`otp:${email}`);
    if (!storedOtp) {
      return res
        .status(400)
        .json({ message: "OTP either expired or invalid." });
    }
    if (storedOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP verified
    await redis.del(`otp:${email}`);
    return res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
});

export default verifyOtp;
