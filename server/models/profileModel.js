const pool = require("../config/db");

// MySQL can hand JSON columns back as strings (TEXT columns, or values that
// were double-encoded). Always convert them back to real arrays/objects.
function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string") return value; // already parsed
  try {
    let v = JSON.parse(value);
    if (typeof v === "string") v = JSON.parse(v); // repair double-encoded rows
    return v;
  } catch {
    return fallback;
  }
}

function normalizeProfile(row) {
  if (!row) return null;
  return {
    ...row,
    disability_types: parseJson(row.disability_types, []),
    accessibility_preferences: parseJson(row.accessibility_preferences, {}),
  };
}

// Get a single user's profile — joined with users so displayUsername
// comes back alongside disability preferences in one query.
async function getProfileByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT dp.*, u.display_username
     FROM disability_profiles dp
     JOIN users u ON u.id = dp.user_id
     WHERE dp.user_id = ?`,
    [userId],
  );
  return normalizeProfile(rows[0]);
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

// --- Phase 2.3 Week 1.3: Display username (peer-facing identity) ---
// Lives on `users`, separate from disability_profiles, since it's an
// account-level identity choice, not an accessibility preference.

async function getUsername(userId) {
  const [rows] = await pool.query(
    "SELECT display_username FROM users WHERE id = ?",
    [userId],
  );
  return rows[0]?.display_username || null;
}

async function setUsername(userId, username) {
  await pool.query("UPDATE users SET display_username = ? WHERE id = ?", [
    username,
    userId,
  ]);
  return getUsername(userId);
}

module.exports = {
  getProfileByUserId,
  upsertProfile,
  getUsername,
  setUsername,
};
