// utils/classSchedule.ts
import type { ClassSchedule } from "./api";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function formatMeetingSchedule(s?: ClassSchedule | null) {
  if (!s || !s.startTime || !s.endTime) return "";
  const time = `${fmt12(s.startTime)} – ${fmt12(s.endTime)}`;

  // One-time class: a single date.
  if (s.startDate && (!s.endDate || s.endDate === s.startDate)) {
    const [y, m, d] = s.startDate.split("-").map(Number);
    const date = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${date} · ${time}`;
  }

  // Older weekly classes
  if (!s.days || s.days.length === 0) return "";
  const days = [...s.days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // Monday first
    .map((d) => DAY_SHORT[d] ?? "")
    .filter(Boolean)
    .join(", ");
  return days ? `${days} · ${time}` : "";
}
