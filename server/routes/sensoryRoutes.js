const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const sensoryController = require("../controllers/sensoryController");

const { getMySensory, updateMySensory } = sensoryController;

// Temporary diagnostic: remove once the controller is fixed
console.log("sensoryController exports:", Object.keys(sensoryController));

if (typeof getMySensory !== "function") {
  throw new Error(
    "sensoryController does not export getMySensory. Exports found: " +
      Object.keys(sensoryController).join(", "),
  );
}
if (typeof updateMySensory !== "function") {
  throw new Error(
    "sensoryController does not export updateMySensory. Exports found: " +
      Object.keys(sensoryController).join(", "),
  );
}

router.get("/", verifyToken, getMySensory);
router.put("/", verifyToken, updateMySensory);

module.exports = router;
