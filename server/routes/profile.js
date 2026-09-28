//profile.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { getProfile, saveProfile } = require("../controllers/profileController");
const { updateUsername } = require("../controllers/profileController");

router.get("/", verifyToken, getProfile);
router.post("/", verifyToken, saveProfile);
router.patch("/username", verifyToken, updateUsername);

module.exports = router;
