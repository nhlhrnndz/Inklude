// server/controllers/authController.js
const crypto = require("crypto");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Constant-time string compare so invite codes can't be guessed by timing.
// Both sides are trimmed and uppercased so stray spaces or case don't matter.
function safeEqual(a, b) {
  const bufA = Buffer.from(
    String(a || "")
      .trim()
      .toUpperCase(),
  );
  const bufB = Buffer.from(
    String(b || "")
      .trim()
      .toUpperCase(),
  );
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Teacher / Guidance accounts can only be created with the invite code
// stored in server/.env. "admin" can never be self-registered.
function getInviteCodeFor(role) {
  if (role === "teacher") return process.env.TEACHER_INVITE_CODE || "";
  if (role === "guidance") return process.env.GUIDANCE_INVITE_CODE || "";
  return "";
}

// REGISTER
// The app can NOT choose a role. The invite code decides:
//   no code        -> student
//   teacher code   -> teacher
//   guidance code  -> guidance
//   anything else  -> rejected (403)
const register = async (req, res) => {
  const { name, email, password, inviteCode } = req.body;

  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }
    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    let finalRole = "student";
    const code = String(inviteCode || "").trim();

    if (code) {
      const teacherCode = getInviteCodeFor("teacher");
      const guidanceCode = getInviteCodeFor("guidance");

      if (teacherCode && safeEqual(code, teacherCode)) {
        finalRole = "teacher";
      } else if (guidanceCode && safeEqual(code, guidanceCode)) {
        finalRole = "guidance";
      } else {
        return res
          .status(403)
          .json({ message: "Invalid staff registration code." });
      }
    }

    const cleanEmail = email.trim();

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
      cleanEmail,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name.trim(), cleanEmail, hashedPassword, finalRole],
    );

    res.status(201).json({
      message: "User registered successfully ✅",
      userId: result.insertId,
      role: finalRole,
    });
  } catch (err) {
    console.error("Register error:", err);
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};

// LOGIN
// One generic message for wrong email OR wrong password, so an attacker
// can't find out which emails exist.
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      String(email).trim(),
    ]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect email or password." });
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
