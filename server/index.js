require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "IncluEd Backend is running ✅" });
});

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
