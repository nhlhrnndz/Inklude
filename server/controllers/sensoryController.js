// server/controllers/sensoryController.js
const {
  getSensorySettings,
  upsertSensorySettings,
} = require("../models/SensorySettings");

const DEFAULT_SETTINGS = {
  mutedColors: false,
  noAnimations: false,
  noSounds: false,
  simplifiedIcons: false,
  whatsNextReminders: true,
};

// Convert a DB row (snake_case, 0/1) into the camelCase object the app uses.
function formatSettings(row) {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    mutedColors: !!row.muted_colors,
    noAnimations: !!row.no_animations,
    noSounds: !!row.no_sounds,
    simplifiedIcons: !!row.simplified_icons,
    whatsNextReminders: !!row.whats_next_reminders,
  };
}

// GET /api/sensory
async function getMySensory(req, res) {
  try {
    const row = await getSensorySettings(req.user.id);
    const settings = formatSettings(row);
    res.json({ ...settings, settings });
  } catch (err) {
    console.error("getMySensory error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching sensory settings." });
  }
}

// PUT /api/sensory
async function updateMySensory(req, res) {
  try {
    const body = req.body || {};

    // Keep the current value for anything the client didn't send.
    const current = formatSettings(await getSensorySettings(req.user.id));
    const pick = (key) =>
      typeof body[key] === "boolean" ? body[key] : current[key];

    const row = await upsertSensorySettings(req.user.id, {
      mutedColors: pick("mutedColors"),
      noAnimations: pick("noAnimations"),
      noSounds: pick("noSounds"),
      simplifiedIcons: pick("simplifiedIcons"),
      whatsNextReminders: pick("whatsNextReminders"),
    });

    const settings = formatSettings(row);
    res.json({
      message: "Sensory settings saved.",
      ...settings,
      settings,
    });
  } catch (err) {
    console.error("updateMySensory error:", err);
    res
      .status(500)
      .json({ message: "Server error while saving sensory settings." });
  }
}

module.exports = { getMySensory, updateMySensory };
