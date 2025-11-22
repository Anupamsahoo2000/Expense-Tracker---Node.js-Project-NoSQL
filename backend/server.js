require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("./utils/db");
const cors = require("cors");
const path = require("path");
const compression = require("compression");

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());

// ROUTES (ADD THIS)
const userRoutes = require("./routes/userRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const premiumRoutes = require("./routes/premiumRoutes");
const passwordRoutes = require("./routes/passwordRoutes");

app.use("/user", userRoutes);
app.use("/expense", expenseRoutes);
app.use("/payment", paymentRoutes);
app.use("/premium", premiumRoutes);
app.use("/password", passwordRoutes);

// FRONTEND STATIC LAST
app.use(express.static(path.join(__dirname, "../frontend")));

const PORT = process.env.PORT || 3000;

mongoose.connection.once("open", () => {
  console.log("MongoDB connected ✔");
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
