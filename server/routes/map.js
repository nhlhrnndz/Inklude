// server/routes/map.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  listLocations,
  addLocation,
  editLocation,
  removeLocation,
  addLocationPhotos,
  removePhoto,
} = require("../controllers/mapController");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "map");
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
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    if (EXT_BY_MIME[file.mimetype]) return cb(null, true);
    cb(new Error("Only JPG, PNG or WEBP photos are allowed."));
  },
});

function handleUpload(req, res, next) {
  upload.array("photos", 3)(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "A photo is too large (max 5 MB each)."
        : err.code === "LIMIT_UNEXPECTED_FILE" ||
            err.code === "LIMIT_FILE_COUNT"
          ? "You can add up to 3 photos."
          : err.message || "Photo upload failed.";
    res.status(400).json({ message });
  });
}

const guidanceOnly = [verifyToken, requireRole("guidance", "admin")];

// Everyone signed in can read the map
router.get("/", verifyToken, listLocations);

// Guidance manages pins
router.delete("/photos/:photoId", ...guidanceOnly, removePhoto);
router.post("/", ...guidanceOnly, handleUpload, addLocation);
router.patch("/:id", ...guidanceOnly, editLocation);
router.delete("/:id", ...guidanceOnly, removeLocation);
router.post("/:id/photos", ...guidanceOnly, handleUpload, addLocationPhotos);

module.exports = router;
