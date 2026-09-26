//basicInfoController.js
const {
  getBasicInfoByUserId,
  upsertBasicInfo,
} = require("../models/basicInfoModel");

function mapBasicInfo(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    yearLevel: row.year_level,
    age: row.age,
    dateOfBirth: row.date_of_birth,
    course: row.course,
    section: row.section,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateBasicInfo(data) {
  if (!data || typeof data !== "object") {
    return "Basic information is required.";
  }
  if (!data.yearLevel || !String(data.yearLevel).trim()) {
    return "Year level is required.";
  }
  if (!data.age || Number.isNaN(Number(data.age)) || Number(data.age) <= 0) {
    return "A valid age is required.";
  }
  if (!data.dateOfBirth || !String(data.dateOfBirth).trim()) {
    return "Date of birth is required.";
  }
  if (!data.course || !String(data.course).trim()) {
    return "Course is required.";
  }
  if (!data.section || !String(data.section).trim()) {
    return "Section is required.";
  }
  return null;
}

// GET /api/basic-info
async function getBasicInfo(req, res) {
  try {
    const userId = req.user.id;
    const info = await getBasicInfoByUserId(userId);

    if (!info) {
      return res
        .status(404)
        .json({ message: "No basic information found for this user." });
    }

    res.json(mapBasicInfo(info));
  } catch (err) {
    console.error("getBasicInfo error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching basic information." });
  }
}

// POST /api/basic-info
async function saveBasicInfo(req, res) {
  try {
    const userId = req.user.id;
    const validationError = validateBasicInfo(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const info = await upsertBasicInfo(userId, req.body);

    res.json({
      message: "Basic information saved successfully.",
      basicInfo: mapBasicInfo(info),
    });
  } catch (err) {
    console.error("saveBasicInfo error:", err);
    res
      .status(500)
      .json({ message: "Server error while saving basic information." });
  }
}

module.exports = { getBasicInfo, saveBasicInfo };
