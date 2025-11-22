// controllers/passwordController.js
const SibApiV3Sdk = require("sib-api-v3-sdk");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const ForgotPasswordRequest = require("../models/forgetPassword");
require("dotenv").config();

const base_url = "http://localhost:3000";

// ------------------ Forgot Password ------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Create forgot password request
    const forgotRequest = await ForgotPasswordRequest.create({
      userId: user._id,
    });

    const resetLink = `${base_url}/reset-password.html?id=${forgotRequest._id}`;

    // Setup Brevo API
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: "Expense Tracker",
    };

    sendSmtpEmail.to = [{ email: user.email, name: user.name }];
    sendSmtpEmail.subject = "Password Reset Request";
    sendSmtpEmail.htmlContent = `
      <h3>Password Reset</h3>
      <p>Click the link to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(200).json({ message: "Password reset link sent!" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// ------------------ Verify Reset Link ------------------
const verifyResetLink = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ForgotPasswordRequest.findById(id);

    if (!request || !request.isActive) {
      return res.status(400).json({ message: "Invalid or expired link" });
    }

    res.status(200).json({
      message: "Link valid",
      userId: request.userId,
    });
  } catch (error) {
    console.error("Verify Link Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ Reset Password ------------------
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const request = await ForgotPasswordRequest.findById(id);

    if (!request || !request.isActive) {
      return res.status(400).json({ message: "Invalid or expired link" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await User.findByIdAndUpdate(request.userId, {
      password: hashedPassword,
    });

    // Make link inactive
    request.isActive = false;
    await request.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  forgotPassword,
  verifyResetLink,
  resetPassword,
};
