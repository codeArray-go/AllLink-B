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
      from: "Resend <otpsend@resend.dev>",
      to: email,
      subject: "Verify your Email",
      html: `<p>Your otp is ${otp} </p>`
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
