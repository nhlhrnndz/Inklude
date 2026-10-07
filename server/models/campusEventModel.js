// server/models/campusEventModel.js
const pool = require("../config/db");

const TAGS = [
  "wheelchair_accessible",
  "captions",
  "quiet_area",
  "accessible_restroom",
  "accessible_seating",
  "audio_announcements",
];

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campus_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      description TEXT NULL,
      location VARCHAR(150) NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status ENUM('active','cancelled') NOT NULL DEFAULT 'active',
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_event_start (start_time)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_accessibility_tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      tag VARCHAR(40) NOT NULL,
      UNIQUE KEY uq_event_tag (event_id, tag),
      CONSTRAINT fk_event_tag_event
        FOREIGN KEY (event_id) REFERENCES campus_events(id)
        ON DELETE CASCADE
    )
  `);
  // Supporting document (letter or photo) that shows the event is legitimate.
  // One document per event. Only Guidance can ever read it.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      stored_name VARCHAR(120) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_type VARCHAR(60) NOT NULL,
      file_size INT NOT NULL,
      uploaded_by INT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_event_document (event_id),
      CONSTRAINT fk_event_document_event
        FOREIGN KEY (event_id) REFERENCES campus_events(id)
        ON DELETE CASCADE
    )
  `);
}

init().catch((err) => console.error("event tables init failed:", err.message));

async function attachTags(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [tags] = await pool.query(
    "SELECT event_id, tag FROM event_accessibility_tags WHERE event_id IN (?)",
    [ids],
  );
  return rows.map((r) => ({
    ...r,
    tags: tags.filter((t) => t.event_id === r.id).map((t) => t.tag),
  }));
}

async function createEvent({
  title,
  description,
  location,
  startTime,
  endTime,
  tags,
  createdBy,
}) {
  const [result] = await pool.query(
    `INSERT INTO campus_events (title, description, location, start_time, end_time, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description || null, location, startTime, endTime, createdBy],
  );
  const id = result.insertId;
  if (tags.length > 0) {
    await pool.query(
      "INSERT INTO event_accessibility_tags (event_id, tag) VALUES ?",
      [tags.map((t) => [id, t])],
    );
  }
  return getEventById(id);
}

// Used only to undo an event whose document could not be saved.
async function deleteEvent(id) {
  await pool.query("DELETE FROM campus_events WHERE id = ?", [id]);
}

async function getEventById(id) {
  const [rows] = await pool.query("SELECT * FROM campus_events WHERE id = ?", [
    id,
  ]);
  if (rows.length === 0) return null;
  const [withTags] = await attachTags(rows);
  return withTags;
}

// Students: upcoming, active events. Guidance: everything from the last 30 days on.
async function listEvents(forGuidance) {
  const where = forGuidance
    ? "end_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    : "status = 'active' AND end_time >= NOW()";
  const [rows] = await pool.query(
    `SELECT * FROM campus_events WHERE ${where} ORDER BY start_time ASC LIMIT 100`,
  );
  return attachTags(rows);
}

async function cancelEvent(id) {
  await pool.query(
    "UPDATE campus_events SET status = 'cancelled' WHERE id = ?",
    [id],
  );
}

// ---- supporting documents (Guidance only) ----

async function addEventDocument({
  eventId,
  storedName,
  originalName,
  fileType,
  fileSize,
  uploadedBy,
}) {
  await pool.query(
    `INSERT INTO event_documents
       (event_id, stored_name, original_name, file_type, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [eventId, storedName, originalName, fileType, fileSize, uploadedBy],
  );
  return getEventDocument(eventId);
}

async function getEventDocument(eventId) {
  const [rows] = await pool.query(
    "SELECT * FROM event_documents WHERE event_id = ? LIMIT 1",
    [eventId],
  );
  return rows[0] || null;
}

// Map of eventId -> document row, for a list of events.
async function getDocumentsForEvents(eventIds) {
  const map = new Map();
  if (!eventIds || eventIds.length === 0) return map;

  const [rows] = await pool.query(
    "SELECT * FROM event_documents WHERE event_id IN (?)",
    [eventIds],
  );
  rows.forEach((r) => map.set(r.event_id, r));
  return map;
}

// ---- calendar helpers (schedule_items rows with source_type 'campus_event') ----

async function getCalendarEventIds(userId) {
  const [rows] = await pool.query(
    "SELECT source_id FROM schedule_items WHERE user_id = ? AND source_type = 'campus_event'",
    [userId],
  );
  return rows.map((r) => Number(r.source_id));
}

async function isInCalendar(userId, eventId) {
  const [rows] = await pool.query(
    `SELECT id FROM schedule_items
     WHERE user_id = ? AND source_type = 'campus_event' AND source_id = ? LIMIT 1`,
    [userId, eventId],
  );
  return rows.length > 0;
}

async function removeFromCalendar(userId, eventId) {
  await pool.query(
    "DELETE FROM schedule_items WHERE user_id = ? AND source_type = 'campus_event' AND source_id = ?",
    [userId, eventId],
  );
}

async function getUserIdsWithEventInCalendar(eventId) {
  const [rows] = await pool.query(
    "SELECT DISTINCT user_id FROM schedule_items WHERE source_type = 'campus_event' AND source_id = ?",
    [eventId],
  );
  return rows.map((r) => r.user_id);
}

module.exports = {
  TAGS,
  createEvent,
  deleteEvent,
  getEventById,
  listEvents,
  cancelEvent,
  addEventDocument,
  getEventDocument,
  getDocumentsForEvents,
  getCalendarEventIds,
  isInCalendar,
  removeFromCalendar,
  getUserIdsWithEventInCalendar,
};
