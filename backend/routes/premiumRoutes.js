// routes/premiumRoutes.js
const express = require("express");
const router = express.Router();
const { premium } = require("../controllers/premiumController");
// import your models
const authenticate = require("../middleware/auth.js"); // optional: only premium users

// GET /premium/leaderboard
router.get("/leaderboard", authenticate, premium);

module.exports = router;
