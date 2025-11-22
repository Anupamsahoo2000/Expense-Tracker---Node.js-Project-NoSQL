const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticate = (req, res, next) => {
  try {
    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    // Expect header: "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ message: "Invalid authorization format" });
    }

    const token = parts[1];

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize token payload so downstream code can use `req.user.id`
    // Many controllers expect `req.user.id` but tokens may contain `userId`.
    req.user = payload || {};
    if (!req.user.id) {
      // Support common variants
      req.user.id =
        req.user.userId || req.user.user_id || req.user._id || req.user.id;
    }
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticate;
