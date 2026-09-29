const pool = require("../config/db");
const { getSessionById } = require("../models/sessionModel");
const {
  createDocument,
  getDocumentById,
  getDocumentsBySessionMeta,
  getDocumentsForUser,
  deleteDocumentById,
} = require("../models/Document");
const {
  extractText,
  UnsupportedFileError,
  NoTextFoundError,
} = require("../services/documentTextService");
const { notifyUsers } = require("../services/notificationService");

function toMetaDto(row) {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mime_type,
    sessionId: row.session_id,
    sessionTitle: row.session_title ?? null,
    teacherName: row.teacher_name ?? null,
    createdAt: row.created_at,
    textLength: row.text_length ?? null,
  };
}

// Teacher: must own the classroom. Student: must have joined it.
async function canAccessSession(user, session) {
  if (!session) return false;
  if (user.role === "teacher") return session.teacher_id === user.id;
  if (user.role === "student") {
    const [rows] = await pool.query(
      "SELECT 1 FROM participants WHERE session_id = ? AND user_id = ? LIMIT 1",
      [session.id, user.id],
    );
    return rows.length > 0;
  }
  return false;
}

// multer reads filenames as latin1; restore proper UTF-8 names.
function fixFilename(name) {
  try {
    return Buffer.from(name || "document", "latin1").toString("utf8");
  } catch {
    return name || "document";
  }
}

// POST /api/documents  (multipart: sessionId, file)
async function uploadDocument(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can upload documents." });
    }

    const sessionId = Number(req.body?.sessionId);
    if (!sessionId) {
      return res.status(400).json({ message: "A classroom is required." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file provided." });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Classroom not found." });
    }
    if (session.teacher_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only upload to your own classrooms." });
    }
    if (session.status !== "active") {
      return res.status(400).json({ message: "This classroom is closed." });
    }

    const filename = fixFilename(req.file.originalname).slice(0, 255);

    let text;
    try {
      text = await extractText({ ...req.file, originalname: filename });
    } catch (err) {
      if (err instanceof UnsupportedFileError) {
        return res.status(415).json({ message: err.message });
      }
      if (err instanceof NoTextFoundError) {
        return res.status(422).json({ message: err.message });
      }
      console.error("Text extraction failed:", err);
      return res.status(500).json({
        message:
          "Could not read this file. Make sure the server packages are installed (pdf-parse, mammoth, tesseract.js).",
      });
    }

    const doc = await createDocument(
      req.user.id,
      sessionId,
      filename,
      req.file.mimetype,
      text,
    );

    // Tell every student who joined this classroom. Never fail the upload
    // just because a notification could not be sent.
    try {
      const [rows] = await pool.query(
        "SELECT user_id FROM participants WHERE session_id = ?",
        [sessionId],
      );
      await notifyUsers(
        rows.map((r) => r.user_id),
        {
          type: "document_uploaded",
          title: `New handout: ${filename}`.slice(0, 150),
          body: `From "${session.title}". Open Documents to listen.`,
          sourceType: "document",
          sourceId: doc.id,
          senderId: req.user.id,
        },
      );
    } catch (notifyErr) {
      console.error("Document notification failed:", notifyErr.message);
    }

    res.status(201).json({
      message: "Document uploaded.",
      document: toMetaDto({ ...doc, text_length: text.length }),
    });
  } catch (err) {
    console.error("uploadDocument error:", err);
    res.status(500).json({ message: "Server error while uploading." });
  }
}

// GET /api/documents/session/:sessionId
async function listSessionDocuments(req, res) {
  try {
    const sessionId = Number(req.params.sessionId);
    const session = await getSessionById(sessionId);
    if (!(await canAccessSession(req.user, session))) {
      return res.status(403).json({ message: "Access denied." });
    }
    const rows = await getDocumentsBySessionMeta(sessionId);
    res.json({ documents: rows.map(toMetaDto) });
  } catch (err) {
    console.error("listSessionDocuments error:", err);
    res.status(500).json({ message: "Server error while loading documents." });
  }
}

// GET /api/documents/mine
async function listMyDocuments(req, res) {
  try {
    if (req.user.role !== "student" && req.user.role !== "teacher") {
      return res.json({ documents: [] });
    }
    const rows = await getDocumentsForUser(req.user.id, req.user.role);
    res.json({ documents: rows.map(toMetaDto) });
  } catch (err) {
    console.error("listMyDocuments error:", err);
    res.status(500).json({ message: "Server error while loading documents." });
  }
}

// GET /api/documents/:id  (metadata + extracted text)
async function getDocument(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid document id." });

    const doc = await getDocumentById(id);
    if (!doc) return res.status(404).json({ message: "Document not found." });

    const session = await getSessionById(doc.session_id);
    if (!(await canAccessSession(req.user, session))) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json({
      document: {
        ...toMetaDto({
          ...doc,
          session_title: session.title,
          teacher_name: session.teacher_name,
        }),
        text: doc.extracted_text || "",
      },
    });
  } catch (err) {
    console.error("getDocument error:", err);
    res.status(500).json({ message: "Server error while loading document." });
  }
}

// DELETE /api/documents/:id  (teacher who owns the classroom)
async function removeDocument(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can delete." });
    }
    const id = Number(req.params.id);
    const doc = await getDocumentById(id);
    if (!doc) return res.status(404).json({ message: "Document not found." });

    const session = await getSessionById(doc.session_id);
    if (!session || session.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }

    await deleteDocumentById(id);
    res.json({ message: "Document removed." });
  } catch (err) {
    console.error("removeDocument error:", err);
    res.status(500).json({ message: "Server error while deleting." });
  }
}

module.exports = {
  uploadDocument,
  listSessionDocuments,
  listMyDocuments,
  getDocument,
  removeDocument,
};
