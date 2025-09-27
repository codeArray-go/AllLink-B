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
      from: "AllLink <hello@resend.io>", // You can replace with your verified domain
      to: email,
      subject: "Verify your Email",
      text: `
        <body style="margin: 0 !important; padding: 0 !important; background-color: #f7f7f7;">

    <!-- Main Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="background-color: #f7f7f7;">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="container">
                    <!-- LOGO -->
                    <tr>
                        <td align="center" valign="top" style="padding: 40px 0 30px 0;">
                            <h1 style="font-size: 36px; font-weight: 800; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">AllLinks</h1>
                        </td>
                    </tr>
                    <!-- Main Content -->
                    <tr>
                        <td align="center" style="padding: 20px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <!-- HEADING -->
                                <tr>
                                    <td align="center" style="padding: 20px 0 0 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: bold; color: #333333;">
                                        Your Verification Code
                                    </td>
                                </tr>
                                <!-- SUBHEADING -->
                                <tr>
                                    <td align="center" style="padding: 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #666666;">
                                        Here is your One-Time Password (OTP). Please use the code below to complete your verification.
                                    </td>
                                </tr>
                                <!-- OTP BOX -->
                                <tr>
                                    <td align="center" style="padding: 10px 0 20px 0;">
                                        <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: bold; color: #ffffff; background-color: #007bff; border-radius: 8px; padding: 15px 30px; letter-spacing: 5px; display: inline-block;">
                                            ${otp}
                                        </div>
                                    </td>
                                </tr>
                                <!-- EXPIRATION INFO -->
                                <tr>
                                    <td align="center" style="padding: 0 0 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #999999;">
                                        This code is valid for 10 minutes.
                                    </td>
                                </tr>
                                <!-- SECURITY NOTE -->
                                <tr>
                                    <td align="center" style="padding: 0 0 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666;">
                                        If you didn't request this code, you can safely ignore this email. Someone else might have typed your email address by mistake.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td align="center" style="padding: 30px 10px 40px 10px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #999999;">
                                        &copy; 2024 AllLinks. All rights reserved.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>

</body>
      `,
});
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
