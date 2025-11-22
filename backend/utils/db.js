const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connection established successfully."))
  .catch((error) => console.error("Unable to connect to MongoDB:", error));

module.exports = mongoose;
