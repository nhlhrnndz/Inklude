const express = require("express");
const multer = require("multer");
const { verifyToken } = require("../middleware/authMiddleware");
const {
  uploadDocument,
  listSessionDocuments,
  listMyDocuments,
  getDocument,
  removeDocument,
} = require("../controllers/documentController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

// Turn multer errors into clean JSON instead of a crash / HTML page.
function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ message: "That file is too large. The limit is 15 MB." });
    }
    return res
      .status(400)
      .json({ message: "Upload failed. Please try again." });
  });
}

// Order matters: fixed paths before "/:id"
router.post("/", verifyToken, handleUpload, uploadDocument);
router.get("/mine", verifyToken, listMyDocuments);
router.get("/session/:sessionId", verifyToken, listSessionDocuments);
router.get("/:id", verifyToken, getDocument);
router.delete("/:id", verifyToken, removeDocument);

module.exports = router;
