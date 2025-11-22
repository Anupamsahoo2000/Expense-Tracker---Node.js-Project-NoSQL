const Expense = require("../models/expenseModel");
const User = require("../models/userModel");
const { getCategoryFromAI } = require("../utils/ai");
const AWS = require("aws-sdk");

// AWS S3 SETUP
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Upload CSV to S3
const uploadToS3 = (fileContent, filename) => {
  return s3
    .upload({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: filename,
      Body: fileContent,
      ACL: "public-read",
      ContentType: "text/csv",
    })
    .promise();
};

// 📦 Download Expenses (Premium Only)
const downloadExpenses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isPremium) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Premium users only.",
      });
    }

    const expenses = await Expense.find({ UserId: req.user.id });

    if (!expenses.length) {
      return res.status(404).json({ message: "No expenses found." });
    }

    const header = "ID,Amount,Description,Category,Date\n";
    const csvData = expenses
      .map(
        (exp) =>
          `${exp._id},${exp.amount},${exp.description},${exp.category},${exp.createdAt}`
      )
      .join("\n");

    const fileContent = header + csvData;
    const filename = `expenses-${req.user.id}-${Date.now()}.csv`;

    const s3Response = await uploadToS3(fileContent, filename);

    return res.status(200).json({
      success: true,
      fileURL: s3Response.Location,
    });
  } catch (err) {
    console.error("Download Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ➕ Add Expense
const addExpense = async (req, res) => {
  try {
    const { amount, description, category } = req.body;

    if (!amount || !description || !category) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const safeAmount = Number(amount);
    if (isNaN(safeAmount) || safeAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const newExpense = await Expense.create({
      amount: safeAmount,
      description,
      category,
      UserId: req.user.id,
    });

    user.totalExpenses += safeAmount;
    await user.save();

    res.status(201).json({ success: true, expense: newExpense });
  } catch (err) {
    console.error("Error adding expense:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🤖 Add Expense Using AI
const addExpenseUsingAI = async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!description)
      return res.status(400).json({ message: "Description is required" });

    const user = await User.findById(req.user.id);

    if (!user || !user.isPremium)
      return res.status(403).json({ message: "Premium access required" });

    const safeAmount = Number(amount);

    const category = (await getCategoryFromAI(description)) || "Other";

    const expense = await Expense.create({
      amount: safeAmount,
      description,
      category,
      UserId: req.user.id,
    });

    user.totalExpenses += safeAmount;
    await user.save();

    res.status(201).json({ success: true, expense });
  } catch (err) {
    console.error("AI Expense Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 📜 Get User Expenses
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ UserId: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, expenses });
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🗑 Delete Expense
const deleteExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;

    const expense = await Expense.findOne({
      _id: expenseId,
      UserId: userId,
    });

    if (!expense)
      return res.status(404).json({
        message: "Expense not found or unauthorized",
      });

    // Update total
    await User.findByIdAndUpdate(userId, {
      $inc: { totalExpenses: -Number(expense.amount) },
    });

    await Expense.deleteOne({ _id: expenseId });

    res.json({ success: true, message: "Expense deleted" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addExpense,
  addExpenseUsingAI,
  getExpenses,
  deleteExpense,
  downloadExpenses,
};
