// server/routes/classRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createClassController,
  listMyClasses,
  joinClassController,
  getClassController,
  getClassMembersController,
  createClassSessionController,
  leaveClassController,
} = require("../controllers/classController");

router.post("/", verifyToken, createClassController);
router.get("/", verifyToken, listMyClasses);
router.post("/join", verifyToken, joinClassController);
router.get("/:id", verifyToken, getClassController);
router.get("/:id/members", verifyToken, getClassMembersController);
router.post("/:id/sessions", verifyToken, createClassSessionController);
router.post("/:id/leave", verifyToken, leaveClassController);

module.exports = router;
