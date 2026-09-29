const {
  getSensorySettings,
  upsertSensorySettings,
} = require("../models/SensorySettings");

// "Sensory-friendly mode" is one master switch in the app; it maps to all
// four columns. It counts as ON when muted_colors is set.
function toDto(row) {
  return {
    sensoryMode: !!row?.muted_colors,
    whatsNextReminders: row ? !!row.whats_next_reminders : true,
    settings: {
      mutedColors: !!row?.muted_colors,
      noAnimations: !!row?.no_animations,
      noSounds: !!row?.no_sounds,
      simplifiedIcons: !!row?.simplified_icons,
    },
  };
}

async function getMySensory(req, res) {
  try {
    const row = await getSensorySettings(req.user.id);
    res.json(toDto(row));
  } catch (err) {
    console.error("getMySensory error:", err);
    res.status(500).json({ message: "Server error while loading settings." });
  }
}

async function updateMySensory(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can change these settings." });
    }

    const { sensoryMode, whatsNextReminders } = req.body || {};

    if (sensoryMode !== undefined && typeof sensoryMode !== "boolean") {
      return res
        .status(400)
        .json({ message: "sensoryMode must be true/false." });
    }
    if (
      whatsNextReminders !== undefined &&
      typeof whatsNextReminders !== "boolean"
    ) {
      return res
        .status(400)
        .json({ message: "whatsNextReminders must be true/false." });
    }

    const current = await getSensorySettings(req.user.id);

    const nextMode =
      sensoryMode !== undefined ? sensoryMode : !!current?.muted_colors;
    const nextReminders =
      whatsNextReminders !== undefined
        ? whatsNextReminders
        : current
          ? !!current.whats_next_reminders
          : true;

    const row = await upsertSensorySettings(req.user.id, {
      mutedColors: nextMode,
      noAnimations: nextMode,
      noSounds: nextMode,
      simplifiedIcons: nextMode,
      whatsNextReminders: nextReminders,
    });

    res.json(toDto(row));
  } catch (err) {
    console.error("updateMySensory error:", err);
    res.status(500).json({ message: "Server error while saving settings." });
  }
}

module.exports = { getMySensory, updateMySensory };
