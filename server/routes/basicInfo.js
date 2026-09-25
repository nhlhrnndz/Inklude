const express = require("express");
const router = express.Router();

const {
  getBasicInfo,
  saveBasicInfo,
} = require("../controllers/basicInfoController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getBasicInfo);
router.post("/", verifyToken, saveBasicInfo);

module.exports = router;
