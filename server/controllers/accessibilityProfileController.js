const {
  ALLOWED_NEEDS,
  getSupportNeeds,
  replaceSupportNeeds,
  getPreferences,
  upsertPreferences,
  getIsOnboarded,
  setOnboarded,
  getUserRole,
} = require("../models/accessibilityProfileModel");

// GET /api/accessibility/me  (student only — returns the student's own data)
async function getMyAccessibility(req, res) {
  try {
    const userId = req.user.id;
    const [supportNeeds, preferences, isOnboarded] = await Promise.all([
      getSupportNeeds(userId),
      getPreferences(userId),
      getIsOnboarded(userId),
    ]);

    res.json({
      needs: supportNeeds.needs,
      otherText: supportNeeds.otherText,
      consentAt: supportNeeds.consentAt,
      preferences,
      isOnboarded,
    });
  } catch (err) {
    console.error("getMyAccessibility error:", err);
    res.status(500).json({ message: "Could not load accessibility data." });
  }
}

// PUT /api/accessibility/support-needs  (student only)
async function saveSupportNeeds(req, res) {
  try {
    const { needs, otherText, consent } = req.body || {};

    if (consent !== true) {
      return res.status(400).json({
        message: "Consent is required before saving your support needs.",
      });
    }
    if (!Array.isArray(needs) || needs.length === 0) {
      return res
        .status(400)
        .json({ message: "Please select at least one option." });
    }

    const unique = [...new Set(needs)];
    const invalid = unique.filter((n) => !ALLOWED_NEEDS.includes(n));
    if (invalid.length > 0) {
      return res
        .status(400)
        .json({ message: `Unknown support need: ${invalid[0]}` });
    }

    let cleanOther = null;
    if (unique.includes("Other")) {
      cleanOther =
        typeof otherText === "string" ? otherText.trim().slice(0, 255) : "";
    }

    await replaceSupportNeeds(req.user.id, unique, cleanOther);

    res.json({ message: "Support needs saved ✅", needs: unique });
  } catch (err) {
    console.error("saveSupportNeeds error:", err);
    res.status(500).json({ message: "Could not save support needs." });
  }
}

// PUT /api/accessibility/preferences  (student only)
async function savePreferences(req, res) {
  try {
    const { preferences } = req.body || {};

    if (
      !preferences ||
      typeof preferences !== "object" ||
      Array.isArray(preferences)
    ) {
      return res
        .status(400)
        .json({
          message: "preferences must be an object of true/false values.",
        });
    }

    await upsertPreferences(req.user.id, preferences);
    const saved = await getPreferences(req.user.id);

    res.json({ message: "Preferences saved ✅", preferences: saved });
  } catch (err) {
    console.error("savePreferences error:", err);
    res.status(500).json({ message: "Could not save preferences." });
  }
}

// PATCH /api/accessibility/onboarded  (student only)
async function markOnboarded(req, res) {
  try {
    await setOnboarded(req.user.id);
    res.json({ message: "Onboarding complete ✅", isOnboarded: true });
  } catch (err) {
    console.error("markOnboarded error:", err);
    res.status(500).json({ message: "Could not update onboarding status." });
  }
}

// GET /api/accessibility/students/:id/support-needs  (guidance only)
async function getStudentSupportNeeds(req, res) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (!studentId) {
      return res.status(400).json({ message: "Invalid student id." });
    }

    const role = await getUserRole(studentId);
    if (role !== "student") {
      return res.status(404).json({ message: "Student not found." });
    }

    const [supportNeeds, preferences] = await Promise.all([
      getSupportNeeds(studentId),
      getPreferences(studentId),
    ]);

    res.json({ ...supportNeeds, preferences });
  } catch (err) {
    console.error("getStudentSupportNeeds error:", err);
    res.status(500).json({ message: "Could not load student support needs." });
  }
}

module.exports = {
  getMyAccessibility,
  saveSupportNeeds,
  savePreferences,
  markOnboarded,
  getStudentSupportNeeds,
};
