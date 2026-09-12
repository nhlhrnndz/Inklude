const express = require("express");
const router = express.Router();
const {
  register,
  login,
  updateProfile,
  changePassword,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.put("/profile", verifyToken, updateProfile);
router.put("/password", verifyToken, changePassword);

module.exports = router;
