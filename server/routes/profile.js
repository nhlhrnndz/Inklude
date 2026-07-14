const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { getProfile, saveProfile } = require("../controllers/profileController");

router.get("/", verifyToken, getProfile);
router.post("/", verifyToken, saveProfile);

module.exports = router;
