// server/routes/classRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  createClassController,
  listMyClasses,
  listMyStudentsController,
  joinClassController,
  getClassController,
  getClassMembersController,
  openClassSessionController,
  getClassDocumentsController,
  createClassSessionController,
  leaveClassController,
} = require("../controllers/classController");

router.post("/", verifyToken, requireRole("teacher"), createClassController);
router.get("/", verifyToken, listMyClasses);

// Must stay above "/:id"
router.get(
  "/my-students",
  verifyToken,
  requireRole("teacher"),
  listMyStudentsController,
);

router.post("/join", verifyToken, requireRole("student"), joinClassController);
router.get("/:id", verifyToken, getClassController);
router.get("/:id/members", verifyToken, getClassMembersController);
router.post(
  "/:id/open-session",
  verifyToken,
  requireRole("teacher"),
  openClassSessionController,
);
router.get("/:id/documents", verifyToken, getClassDocumentsController);
router.post(
  "/:id/sessions",
  verifyToken,
  requireRole("teacher"),
  createClassSessionController,
);
router.post(
  "/:id/leave",
  verifyToken,
  requireRole("student"),
  leaveClassController,
);

module.exports = router;
