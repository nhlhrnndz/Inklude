const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "IncluEd Backend is running ✅" });
});

// Test DB connection
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    res.json({ message: "Database connected ✅", result: rows[0].result });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Database connection failed ❌", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`IncluEd server running on port ${PORT}`);
});
