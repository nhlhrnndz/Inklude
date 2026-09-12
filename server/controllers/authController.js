const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role],
    );

    res.status(201).json({
      message: "User registered successfully ✅",
      userId: result.insertId,
    });
  } catch (err) {
    console.error("Register error:", err);
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

// LOGIN
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const secret = process.env.JWT_SECRET;
    console.log("JWT_SECRET:", secret ? "loaded ✅" : "MISSING ❌");

    const token = jwt.sign({ id: user.id, role: user.role }, secret, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful ✅",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// UPDATE PROFILE (name/email) — requires verifyToken, uses req.user.id
const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email.trim(), userId],
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "Email is already in use by another account." });
    }

    await db.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [
      name.trim(),
      email.trim(),
      userId,
    ]);

    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [userId],
    );

    res.json({
      message: "Profile updated successfully ✅",
      user: rows[0],
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res
      .status(500)
      .json({ message: "Failed to update profile", error: err.message });
  }
};

// CHANGE PASSWORD — requires verifyToken, uses req.user.id
const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });
    }

    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);

    res.json({ message: "Password changed successfully ✅" });
  } catch (err) {
    console.error("Change password error:", err);
    res
      .status(500)
      .json({ message: "Failed to change password", error: err.message });
  }
};

module.exports = { register, login, updateProfile, changePassword };
