// server/controllers/mapController.js
const fs = require("fs");
const path = require("path");
const {
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
} = require("../models/mapModel");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "map");

function format(l) {
  return {
    id: l.id,
    building: l.building,
    type: l.type,
    floor: l.floor || "",
    note: l.note || "",
    xPct: Number(l.x_pct),
    yPct: Number(l.y_pct),
    photos: (l.photos || []).map((p) => ({
      id: p.id,
      url: `/uploads/map/${p.file_path}`,
    })),
  };
}

function removeFiles(files) {
  (files || []).forEach((f) => {
    if (f && f.path) fs.unlink(f.path, () => {});
  });
}

function removeNames(names) {
  (names || []).forEach((n) => fs.unlink(path.join(UPLOAD_DIR, n), () => {}));
}

function cleanFields(body) {
  const building = String(body.building || "").trim();
  const type = String(body.type || "");
  const floor = String(body.floor || "").trim();
  const note = String(body.note || "").trim();

  if (building.length < 2 || building.length > 100) {
    return { error: "Enter the building or place name (2-100 characters)." };
  }
  if (!TYPES.includes(type)) return { error: "Choose a facility type." };
  if (floor.length > 30) return { error: "Floor is too long (max 30)." };
  if (note.length > 300) return { error: "Note is too long (max 300)." };
  return { building, type, floor, note };
}

// GET /api/map  (any signed-in user)
async function listLocations(req, res) {
  try {
    const rows = await getAllLocations();
    res.json({ locations: rows.map(format) });
  } catch (err) {
    console.error("listLocations error:", err);
    res.status(500).json({ message: "Server error while loading the map." });
  }
}

// POST /api/map  (multipart: building, type, floor?, note?, xPct, yPct, photos[])
async function addLocation(req, res) {
  const files = req.files || [];
  try {
    const fields = cleanFields(req.body);
    if (fields.error) {
      removeFiles(files);
      return res.status(400).json({ message: fields.error });
    }

    const xPct = Number(req.body.xPct);
    const yPct = Number(req.body.yPct);
    if (
      !Number.isFinite(xPct) ||
      !Number.isFinite(yPct) ||
      xPct < 0 ||
      xPct > 100 ||
      yPct < 0 ||
      yPct > 100
    ) {
      removeFiles(files);
      return res.status(400).json({ message: "Tap the map to place the pin." });
    }

    const id = await createLocation({
      ...fields,
      xPct: Math.round(xPct * 1000) / 1000,
      yPct: Math.round(yPct * 1000) / 1000,
      createdBy: req.user.id,
    });
    await addPhotos(
      id,
      files.map((f) => f.filename),
    );

    const fresh = await getLocationById(id);
    res.status(201).json({ message: "Pin added.", location: format(fresh) });
  } catch (err) {
    removeFiles(files);
    console.error("addLocation error:", err);
    res.status(500).json({ message: "Server error while saving the pin." });
  }
}

// PATCH /api/map/:id  { building, type, floor?, note? }
async function editLocation(req, res) {
  try {
    const loc = await getLocationById(req.params.id);
    if (!loc) return res.status(404).json({ message: "Pin not found." });

    const fields = cleanFields(req.body);
    if (fields.error) return res.status(400).json({ message: fields.error });

    await updateLocation(loc.id, fields);
    const fresh = await getLocationById(loc.id);
    res.json({ message: "Updated.", location: format(fresh) });
  } catch (err) {
    console.error("editLocation error:", err);
    res.status(500).json({ message: "Server error while updating the pin." });
  }
}

// DELETE /api/map/:id
async function removeLocation(req, res) {
  try {
    const loc = await getLocationById(req.params.id);
    if (!loc) return res.status(404).json({ message: "Pin not found." });

    const names = await deleteLocation(loc.id);
    removeNames(names);
    res.json({ message: "Pin removed." });
  } catch (err) {
    console.error("removeLocation error:", err);
    res.status(500).json({ message: "Server error while removing the pin." });
  }
}

// POST /api/map/:id/photos  (multipart: photos[])
async function addLocationPhotos(req, res) {
  const files = req.files || [];
  try {
    const loc = await getLocationById(req.params.id);
    if (!loc) {
      removeFiles(files);
      return res.status(404).json({ message: "Pin not found." });
    }
    if (files.length === 0) {
      return res.status(400).json({ message: "Choose at least one photo." });
    }

    const existing = await countPhotos(loc.id);
    if (existing + files.length > MAX_PHOTOS) {
      removeFiles(files);
      return res
        .status(400)
        .json({ message: `A pin can have up to ${MAX_PHOTOS} photos.` });
    }

    await addPhotos(
      loc.id,
      files.map((f) => f.filename),
    );
    const fresh = await getLocationById(loc.id);
    res.status(201).json({ message: "Photos added.", location: format(fresh) });
  } catch (err) {
    removeFiles(files);
    console.error("addLocationPhotos error:", err);
    res.status(500).json({ message: "Server error while saving photos." });
  }
}

// DELETE /api/map/photos/:photoId
async function removePhoto(req, res) {
  try {
    const photo = await getPhoto(req.params.photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found." });

    await deletePhoto(photo.id);
    removeNames([photo.file_path]);
    res.json({ message: "Photo removed." });
  } catch (err) {
    console.error("removePhoto error:", err);
    res.status(500).json({ message: "Server error while removing the photo." });
  }
}

module.exports = {
  listLocations,
  addLocation,
  editLocation,
  removeLocation,
  addLocationPhotos,
  removePhoto,
};
