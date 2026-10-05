//server/routes/reports.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  submitReport,
  getMine,
  listAll,
  stats,
  updateStatus,
} = require("../controllers/reportController");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "reports");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] || ".jpg";
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXT_BY_MIME[file.mimetype]) return cb(null, true);
    cb(new Error("Only JPG, PNG or WEBP photos are allowed."));
  },
});

function handleUpload(req, res, next) {
  upload.single("photo")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Photo is too large (max 5 MB)."
        : err.message || "Photo upload failed.";
    res.status(400).json({ message });
  });
}

// Student
router.post(
  "/",
  verifyToken,
  requireRole("student"),
  handleUpload,
  submitReport,
);
router.get("/mine", verifyToken, requireRole("student"), getMine);

// Guidance (keep /stats above anything with /:id)
router.get("/stats", verifyToken, requireRole("guidance", "admin"), stats);
router.get("/", verifyToken, requireRole("guidance", "admin"), listAll);
router.patch(
  "/:id/status",
  verifyToken,
  requireRole("guidance", "admin"),
  updateStatus,
);

module.exports = router;
