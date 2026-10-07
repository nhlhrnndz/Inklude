// server/routes/events.js
const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  EVENT_DOC_DIR,
  listEvents,
  createEvent,
  downloadDocument,
  cancelEvent,
  addToCalendar,
  removeFromCalendar,
} = require("../controllers/eventController");

const router = express.Router();

// Supporting document: PDF, JPG or PNG only, max 5 MB.
const EXT_BY_MIME = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, EVENT_DOC_DIR),
    filename: (req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] || ".bin";
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXT_BY_MIME[file.mimetype]) return cb(null, true);
    cb(new Error("Only PDF, JPG or PNG files are allowed."));
  },
});

function handleUpload(req, res, next) {
  upload.single("document")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "The document is too large (max 5 MB)."
        : err.code === "LIMIT_UNEXPECTED_FILE" ||
            err.code === "LIMIT_FILE_COUNT"
          ? "Attach one document only."
          : err.message || "Document upload failed.";
    res.status(400).json({ message });
  });
}

const guidanceOnly = [verifyToken, requireRole("guidance", "admin")];

router.get("/", verifyToken, listEvents);

// Authentication and role are checked BEFORE the file is accepted.
router.post("/", ...guidanceOnly, handleUpload, createEvent);

// Supporting document: Guidance only, never a public static file.
router.get("/:id/document", ...guidanceOnly, downloadDocument);

router.patch("/:id/cancel", ...guidanceOnly, cancelEvent);

router.post(
  "/:id/calendar",
  verifyToken,
  requireRole("student"),
  addToCalendar,
);
router.delete(
  "/:id/calendar",
  verifyToken,
  requireRole("student"),
  removeFromCalendar,
);

module.exports = router;
