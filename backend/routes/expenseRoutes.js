const express = require("express");
const router = express.Router();
const {
  addExpense,
  addExpenseUsingAI,
  getExpenses,
  deleteExpense,
  downloadExpenses,
} = require("../controllers/expenseController");
const authenticate = require("../middleware/auth");

console.log("addExpense:", addExpense);

router.post("/add-expense", authenticate, addExpense);
router.post("/add-expense-ai", authenticate, addExpenseUsingAI);
router.get("/get-expenses", authenticate, getExpenses);
router.get("/download-expenses", authenticate, downloadExpenses);
router.delete("/delete-expense/:id", authenticate, deleteExpense);

module.exports = router;
