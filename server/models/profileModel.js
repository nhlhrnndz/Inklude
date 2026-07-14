const pool = require("../config/db");

// Get a single user's profile
async function getProfileByUserId(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM disability_profiles WHERE user_id = ?",
    [userId],
  );
  return rows[0] || null;
}

// Create or update (upsert) a user's profile
async function upsertProfile(
  userId,
  disabilityTypes,
  accessibilityPreferences,
) {
  const disabilityTypesJson = JSON.stringify(disabilityTypes);
  const preferencesJson = JSON.stringify(accessibilityPreferences);

  await pool.query(
    `INSERT INTO disability_profiles (user_id, disability_types, accessibility_preferences)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       disability_types = VALUES(disability_types),
       accessibility_preferences = VALUES(accessibility_preferences)`,
    [userId, disabilityTypesJson, preferencesJson],
  );

  return getProfileByUserId(userId);
}

module.exports = { getProfileByUserId, upsertProfile };
