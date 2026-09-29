const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createItem,
  getToday,
  getWeek,
  removeItem,
} = require("../controllers/scheduleController");

router.post("/", verifyToken, createItem);
router.get("/today", verifyToken, getToday);
router.get("/week", verifyToken, getWeek);
router.delete("/:id", verifyToken, removeItem);

module.exports = router;
