//server\routes\scheduleRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createItem,
  getToday,
  getWeek,
  getUpcoming,
  removeItem,
  listClassPosts,
  createClassPost,
  deleteClassPost,
} = require("../controllers/scheduleController");

// Student calendar
router.post("/", verifyToken, createItem);
router.get("/today", verifyToken, getToday);
router.get("/week", verifyToken, getWeek);
router.get("/upcoming", verifyToken, getUpcoming);

// Teacher: exams and assignments (declared before "/:id")
router.get("/class/:classId/posts", verifyToken, listClassPosts);
router.post("/class/:classId/posts", verifyToken, createClassPost);
router.delete("/class/posts/:id", verifyToken, deleteClassPost);

router.delete("/:id", verifyToken, removeItem);

module.exports = router;
