const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getMySensory,
  updateMySensory,
} = require("../controllers/sensoryController");

router.get("/", verifyToken, getMySensory);
router.put("/", verifyToken, updateMySensory);

module.exports = router;
