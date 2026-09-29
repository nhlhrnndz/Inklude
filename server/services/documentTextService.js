// server/services/documentTextService.js
//
// Turns an uploaded file (PDF, DOCX, JPG, PNG) into clean plain text that
// the Document Reader can speak. Libraries are required lazily so the
// server still boots if one of them isn't installed yet.

const path = require("path");

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAX_CHARS = 500000;

class UnsupportedFileError extends Error {}
class NoTextFoundError extends Error {}

function detectKind(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  if (ext === ".pdf" || mime === "application/pdf") return "pdf";
  if (ext === ".docx" || mime === DOCX_MIME) return "docx";
  if (
    [".jpg", ".jpeg", ".png"].includes(ext) ||
    mime === "image/jpeg" ||
    mime === "image/png"
  ) {
    return "image";
  }
  return null;
}

function cleanText(raw, { joinLines = false } = {}) {
  let text = String(raw || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n");

  if (joinLines) {
    // PDFs and OCR break lines mid-sentence. Re-join single line breaks
    // (keep blank-line paragraph breaks) and fix hyphenated line wraps.
    text = text
      .replace(/([a-z])-\n(?=[a-z])/g, "$1")
      .replace(/([^\n])\n(?!\n)/g, "$1 ");
  }

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

async function extractPdf(buffer) {
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const data = await pdfParse(buffer);
  return cleanText(data.text, { joinLines: true });
}

async function extractDocx(buffer) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return cleanText(result.value);
}

async function extractImage(buffer) {
  const Tesseract = require("tesseract.js");
  const { data } = await Tesseract.recognize(buffer, "eng");
  return cleanText(data.text, { joinLines: true });
}

async function extractText(file) {
  const kind = detectKind(file);
  if (!kind) {
    throw new UnsupportedFileError(
      "Unsupported file type. Please upload a PDF, DOCX, JPG, or PNG.",
    );
  }

  let text = "";
  if (kind === "pdf") text = await extractPdf(file.buffer);
  else if (kind === "docx") text = await extractDocx(file.buffer);
  else text = await extractImage(file.buffer);

  if (!text) {
    throw new NoTextFoundError(
      kind === "pdf"
        ? "No readable text was found in this PDF. If it is a scan, upload it as a JPG or PNG image instead."
        : "No readable text was found in this file.",
    );
  }

  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
}

module.exports = { extractText, UnsupportedFileError, NoTextFoundError };
