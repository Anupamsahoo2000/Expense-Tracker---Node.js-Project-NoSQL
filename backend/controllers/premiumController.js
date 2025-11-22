// controllers/premiumController.js
const User = require("../models/userModel");

// 🏆 Premium Leaderboard
const premium = async (req, res) => {
  try {
    // Fetch users sorted by totalExpenses
    const leaderboard = await User.find({}, "name totalExpenses").sort({
      totalExpenses: -1,
    }); // DESC order

    res.status(200).json({ success: true, leaderboard });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard",
    });
  }
};

module.exports = { premium };
