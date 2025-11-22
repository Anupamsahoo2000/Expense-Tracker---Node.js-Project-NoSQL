// models/ForgotPasswordRequest.js
const mongoose = require("mongoose");

const forgotPasswordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForgotPasswordRequest", forgotPasswordSchema);
