// models/Expense.js
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    note: {
      type: String,
    },

    UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // since you used allowNull: true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
