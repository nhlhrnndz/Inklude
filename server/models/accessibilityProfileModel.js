const db = require("../config/db");

// Must match constants/supportNeedsPresets.ts on the frontend.
const ALLOWED_NEEDS = [
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Low Vision",
  "Color Blindness",
  "Dyslexia",
  "Physical / Motor",
  "Autism",
  "Other",
];

const ALLOWED_PREF_KEYS = [
  "high_contrast",
  "large_text",
  "magnification",
  "dark_mode",
  "reduced_motion",
  "reduced_clutter",
  "live_captions",
  "text_to_speech",
  "visual_notifications",
  "gentle_notifications",
  "larger_buttons",
  "keyboard_navigation",
  "longer_interaction_time",
];

async function getSupportNeeds(userId) {
  const [rows] = await db.query(
    "SELECT need, other_text, consent_at FROM student_support_needs WHERE user_id = ? ORDER BY id",
    [userId],
  );
  const other = rows.find((r) => r.need === "Other");
  return {
    needs: rows.map((r) => r.need),
    otherText: other ? other.other_text : null,
    consentAt: rows.length > 0 ? rows[0].consent_at : null,
  };
}

// Replaces the student's whole set of needs atomically.
async function replaceSupportNeeds(userId, needs, otherText) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM student_support_needs WHERE user_id = ?", [
      userId,
    ]);
    for (const need of needs) {
      await conn.query(
        `INSERT INTO student_support_needs (user_id, need, other_text, consent_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, need, need === "Other" ? otherText || null : null],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getPreferences(userId) {
  const [rows] = await db.query(
    "SELECT pref_key, pref_value FROM accessibility_preferences WHERE user_id = ?",
    [userId],
  );
  const prefs = {};
  rows.forEach((r) => {
    prefs[r.pref_key] = !!r.pref_value;
  });
  return prefs;
}

async function upsertPreferences(userId, prefs) {
  const values = Object.entries(prefs)
    .filter(([key]) => ALLOWED_PREF_KEYS.includes(key))
    .map(([key, value]) => [userId, key, value ? 1 : 0]);

  if (values.length === 0) return;

  await db.query(
    `INSERT INTO accessibility_preferences (user_id, pref_key, pref_value)
     VALUES ?
     ON DUPLICATE KEY UPDATE pref_value = VALUES(pref_value)`,
    [values],
  );
}

async function getIsOnboarded(userId) {
  const [rows] = await db.query("SELECT is_onboarded FROM users WHERE id = ?", [
    userId,
  ]);
  return rows.length > 0 ? !!rows[0].is_onboarded : false;
}

async function setOnboarded(userId) {
  await db.query("UPDATE users SET is_onboarded = 1 WHERE id = ?", [userId]);
}

async function getUserRole(userId) {
  const [rows] = await db.query("SELECT role FROM users WHERE id = ?", [
    userId,
  ]);
  return rows.length > 0 ? rows[0].role : null;
}

module.exports = {
  ALLOWED_NEEDS,
  ALLOWED_PREF_KEYS,
  getSupportNeeds,
  replaceSupportNeeds,
  getPreferences,
  upsertPreferences,
  getIsOnboarded,
  setOnboarded,
  getUserRole,
};
