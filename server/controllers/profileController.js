//profileController.js
const {
  getProfileByUserId,
  upsertProfile,
  setUsername,
} = require("../models/profileModel");

const VALID_DISABILITY_TYPES = [
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Autism",
  "ADHD",
  "Dyslexia",
  "Blind / Low Vision",
  "Physical / Motor",
];

// Letters, numbers, spaces, underscore, hyphen, period. 3–30 chars.
// Kept simple on purpose — no uniqueness check yet (roadmap flagged
// this as optional; skip for now to keep the flow one-tap-friendly).
const USERNAME_PATTERN = /^[A-Za-z0-9 _.-]{3,30}$/;

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
      displayUsername: profile.display_username || null,
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
        displayUsername: profile.display_username || null,
      },
    });
  } catch (err) {
    console.error("saveProfile error:", err);
    res.status(500).json({ message: "Server error while saving profile." });
  }
}

// PATCH /api/profile/username — student sets/changes their peer-facing
// display name. Teachers/guidance never call this; their view always
// resolves to the real name regardless of what's stored here.
async function updateUsername(req, res) {
  try {
    const userId = req.user.id;
    const { username } = req.body;

    if (username === null || username === "") {
      // Explicitly clearing the username — falls back to "First L." in rosters.
      await setUsername(userId, null);
      return res.json({
        message: "Display username cleared.",
        displayUsername: null,
      });
    }

    if (
      typeof username !== "string" ||
      !USERNAME_PATTERN.test(username.trim())
    ) {
      return res.status(400).json({
        message:
          "Username must be 3–30 characters (letters, numbers, spaces, - _ . only).",
      });
    }

    const trimmed = username.trim();
    const saved = await setUsername(userId, trimmed);

    res.json({
      message: "Display username updated.",
      displayUsername: saved,
    });
  } catch (err) {
    console.error("updateUsername error:", err);
    res.status(500).json({ message: "Server error while updating username." });
  }
}

module.exports = {
  getProfile,
  saveProfile,
  updateUsername,
  VALID_DISABILITY_TYPES,
};
