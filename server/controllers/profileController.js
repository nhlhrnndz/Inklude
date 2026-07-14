const { getProfileByUserId, upsertProfile } = require("../models/profileModel");

const VALID_DISABILITY_TYPES = [
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Autism",
  "ADHD",
  "Dyslexia",
];

// GET /api/profile
async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return res
        .status(404)
        .json({ message: "No profile found for this user." });
    }

    res.json({
      id: profile.id,
      userId: profile.user_id,
      disabilityTypes: profile.disability_types,
      accessibilityPreferences: profile.accessibility_preferences,
    });
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ message: "Server error while fetching profile." });
  }
}

// POST /api/profile
async function saveProfile(req, res) {
  try {
    const userId = req.user.id;
    const { disabilityTypes, accessibilityPreferences } = req.body;

    if (!Array.isArray(disabilityTypes) || disabilityTypes.length === 0) {
      return res
        .status(400)
        .json({ message: "Please select at least one disability category." });
    }

    const invalid = disabilityTypes.filter(
      (t) => !VALID_DISABILITY_TYPES.includes(t),
    );
    if (invalid.length > 0) {
      return res
        .status(400)
        .json({ message: `Invalid disability type(s): ${invalid.join(", ")}` });
    }

    if (
      typeof accessibilityPreferences !== "object" ||
      accessibilityPreferences === null
    ) {
      return res
        .status(400)
        .json({ message: "accessibilityPreferences must be an object." });
    }

    const profile = await upsertProfile(
      userId,
      disabilityTypes,
      accessibilityPreferences,
    );

    res.json({
      message: "Profile saved successfully.",
      profile: {
        id: profile.id,
        userId: profile.user_id,
        disabilityTypes: profile.disability_types,
        accessibilityPreferences: profile.accessibility_preferences,
      },
    });
  } catch (err) {
    console.error("saveProfile error:", err);
    res.status(500).json({ message: "Server error while saving profile." });
  }
}

module.exports = { getProfile, saveProfile };
