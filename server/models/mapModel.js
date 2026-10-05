// server/models/mapModel.js
const pool = require("../config/db");

const TYPES = [
  "pwd_restroom",
  "ramp",
  "elevator",
  "accessible_entrance",
  "accessible_seating",
  "other",
];
const MAX_PHOTOS = 3;

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      building VARCHAR(100) NOT NULL,
      type VARCHAR(30) NOT NULL,
      floor VARCHAR(30) NULL,
      note VARCHAR(300) NULL,
      x_pct DECIMAL(6,3) NOT NULL,
      y_pct DECIMAL(6,3) NOT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_location_photos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      location_id INT NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_map_photo_location (location_id),
      CONSTRAINT fk_map_photo_location
        FOREIGN KEY (location_id) REFERENCES map_locations(id)
        ON DELETE CASCADE
    )
  `);
}

init().catch((err) => console.error("map tables init failed:", err.message));

async function attachPhotos(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [photos] = await pool.query(
    "SELECT id, location_id, file_path FROM map_location_photos WHERE location_id IN (?) ORDER BY id ASC",
    [ids],
  );
  return rows.map((r) => ({
    ...r,
    photos: photos.filter((p) => p.location_id === r.id),
  }));
}

async function getAllLocations() {
  const [rows] = await pool.query(
    "SELECT * FROM map_locations ORDER BY building ASC, id ASC",
  );
  return attachPhotos(rows);
}

async function getLocationById(id) {
  const [rows] = await pool.query("SELECT * FROM map_locations WHERE id = ?", [
    id,
  ]);
  if (rows.length === 0) return null;
  const [withPhotos] = await attachPhotos(rows);
  return withPhotos;
}

async function createLocation({
  building,
  type,
  floor,
  note,
  xPct,
  yPct,
  createdBy,
}) {
  const [result] = await pool.query(
    `INSERT INTO map_locations (building, type, floor, note, x_pct, y_pct, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [building, type, floor || null, note || null, xPct, yPct, createdBy],
  );
  return result.insertId;
}

async function updateLocation(id, { building, type, floor, note }) {
  await pool.query(
    `UPDATE map_locations SET building = ?, type = ?, floor = ?, note = ? WHERE id = ?`,
    [building, type, floor || null, note || null, id],
  );
}

// Returns the photo filenames so the controller can delete the files.
async function deleteLocation(id) {
  const [photos] = await pool.query(
    "SELECT file_path FROM map_location_photos WHERE location_id = ?",
    [id],
  );
  await pool.query("DELETE FROM map_locations WHERE id = ?", [id]);
  return photos.map((p) => p.file_path);
}

async function countPhotos(locationId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS c FROM map_location_photos WHERE location_id = ?",
    [locationId],
  );
  return Number(rows[0].c);
}

async function addPhotos(locationId, filenames) {
  if (!filenames.length) return;
  await pool.query(
    "INSERT INTO map_location_photos (location_id, file_path) VALUES ?",
    [filenames.map((f) => [locationId, f])],
  );
}

async function getPhoto(photoId) {
  const [rows] = await pool.query(
    "SELECT * FROM map_location_photos WHERE id = ?",
    [photoId],
  );
  return rows[0] || null;
}

async function deletePhoto(photoId) {
  await pool.query("DELETE FROM map_location_photos WHERE id = ?", [photoId]);
}

module.exports = {
  TYPES,
  MAX_PHOTOS,
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  countPhotos,
  addPhotos,
  getPhoto,
  deletePhoto,
};
