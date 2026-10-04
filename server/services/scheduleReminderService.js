//server\services\scheduleReminderService.js
const pool = require("../config/db");
const { notifyUser } = require("./notificationService");

const CHECK_EVERY_MS = 60 * 1000;
const REMINDER_WINDOW_MINUTES = 5;

let timer = null;
let running = false;

// Where tapping the reminder should go.
//   class session  -> the session screen
//   appointment    -> the appointment screen
//   anything else  -> this exact calendar item
function targetFor(row) {
  if (row.source_type === "session" && row.source_id) {
    return { sourceType: "session", sourceId: row.source_id };
  }
  if (row.source_type === "appointment" && row.source_id) {
    return { sourceType: "appointment", sourceId: row.source_id };
  }
  return { sourceType: "schedule_item", sourceId: row.id };
}

function reminderTitle(row, minutes) {
  const when = `${minutes} minute${minutes === 1 ? "" : "s"}`;

  if (row.type === "assignment") {
    return `${row.title} is due in ${when}.`.slice(0, 150);
  }
  if (row.type === "reminder") {
    return `Reminder in ${when}: ${row.title}`.slice(0, 150);
  }

  let label;
  if (row.source_type === "session") {
    label = row.subject ? `${row.title}: ${row.subject}` : row.title;
  } else {
    label = row.subject || row.title;
  }
  return `${label} starts in ${when}.`.slice(0, 150);
}

function reminderBody(row) {
  if (row.source_type === "session") return "Tap to open the class.";
  if (row.source_type === "appointment") return "Tap to see the details.";
  return "Tap to open your schedule.";
}

// Finds items starting within the next 5 minutes that haven't been
// reminded yet, and sends each student one "What's Next" notification.
async function checkDueReminders() {
  if (running) return;
  running = true;

  try {
    const [rows] = await pool.query(
      `SELECT si.id, si.user_id, si.title, si.subject, si.type,
              si.source_type, si.source_id,
              TIMESTAMPDIFF(SECOND, NOW(), si.start_time) AS secs_until
       FROM schedule_items si
       LEFT JOIN sensory_settings ss ON ss.user_id = si.user_id
       WHERE si.reminder_sent = 0
         AND si.start_time > NOW()
         AND si.start_time <= DATE_ADD(NOW(), INTERVAL ${REMINDER_WINDOW_MINUTES} MINUTE)
         AND COALESCE(ss.whats_next_reminders, 1) = 1`,
    );

    for (const row of rows) {
      // Claim it first so two overlapping runs can never double-send.
      const [claim] = await pool.query(
        "UPDATE schedule_items SET reminder_sent = 1 WHERE id = ? AND reminder_sent = 0",
        [row.id],
      );
      if (claim.affectedRows === 0) continue;

      const minutes = Math.max(1, Math.ceil(row.secs_until / 60));
      const target = targetFor(row);

      await notifyUser(row.user_id, {
        type: "schedule_reminder",
        title: reminderTitle(row, minutes),
        body: reminderBody(row),
        sourceType: target.sourceType,
        sourceId: target.sourceId,
      });
    }
  } catch (err) {
    console.error("❌ Schedule reminder check failed:", err.message);
  } finally {
    running = false;
  }
}

function startScheduleReminders() {
  if (timer) return;
  checkDueReminders();
  timer = setInterval(checkDueReminders, CHECK_EVERY_MS);
  console.log("⏰ What's Next reminders running (checks every minute)");
}

module.exports = { startScheduleReminders };
