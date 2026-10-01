//generateSessionReport.js

const PDFDocument = require("pdfkit");

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(startValue, endValue) {
  if (!startValue || !endValue) return "—";
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  const ms = end - start;
  if (ms <= 0) return "—";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function generateSessionReport(res, { session, participants, transcripts }) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="session-${session.id}-report.pdf"`,
  );

  doc.pipe(res);

  // --- Header ---
  doc.fontSize(20).font("Helvetica-Bold").text("IncluEd Session Report", {
    align: "center",
  });
  doc.moveDown(1);

  doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text(session.title);

  if (session.description) {
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#555")
      .text(session.description);
  }

  doc.moveDown(0.5);
  doc.fillColor("#000");

  const metaRows = [
    ["Session Code", session.session_code],
    ["Teacher", session.teacher_name],
    ["Status", session.status === "ended" ? "Ended" : "Active"],
    ["Started", formatDateTime(session.created_at)],
    ["Ended", session.ended_at ? formatDateTime(session.ended_at) : "—"],
    ["Duration", formatDuration(session.created_at, session.ended_at)],
    ["Participants", String(participants.length)],
  ];

  metaRows.forEach(([label, value]) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${label}: `, { continued: true })
      .font("Helvetica")
      .text(value ?? "—");
  });

  doc.moveDown(1);
  doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(1);

  // --- Participants ---
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor("#000")
    .text("Participants");
  doc.moveDown(0.5);

  if (participants.length === 0) {
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("No participants joined this session.");
  } else {
    participants.forEach((p, index) => {
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          `${index + 1}. ${p.name}   (Joined: ${formatDateTime(p.joined_at)}${
            p.left_at ? `, Left: ${formatDateTime(p.left_at)}` : ""
          })`,
        );
    });
  }

  doc.moveDown(1);
  doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(1);

  // --- Transcript ---
  doc.fontSize(13).font("Helvetica-Bold").text("Transcript");
  doc.moveDown(0.5);

  if (transcripts.length === 0) {
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("No captions were recorded for this session.");
  } else {
    transcripts.forEach((t) => {
      const time = new Date(t.created_at).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#333")
        .text(`[${time}] ${t.speaker_name}: `, { continued: true })
        .font("Helvetica")
        .fillColor("#000")
        .text(t.text);

      doc.moveDown(0.3);
    });
  }

  doc.end();
}

module.exports = { generateSessionReport };
