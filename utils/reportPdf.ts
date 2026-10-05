// utils/reportPdf.ts
// Builds a print-styled HTML report and opens the browser's print dialog,
// where Guidance chooses "Save as PDF". Web only, no packages needed.
import type { AccessibilityReportExport } from "./guidanceReportApi";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#ed6c02",
  in_progress: "#1565c0",
  resolved: "#2e7d32",
};

export function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function formatDuration(hours: number | null) {
  if (hours === null || Number.isNaN(hours)) return "—";
  if (hours < 24) return `${Math.max(1, Math.round(hours))} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bar(label: string, value: number, max: number, color: string) {
  const pct =
    max > 0 && value > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return `
    <div class="bar">
      <div class="bar-top"><span>${esc(label)}</span><b>${value}</b></div>
      <div class="track"><div class="fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
}

function trendText(data: AccessibilityReportExport) {
  const diff = data.total - data.previousMonthTotal;
  if (data.previousMonthTotal === 0 && data.total === 0) {
    return "No reports this month or last month.";
  }
  if (diff === 0) {
    return `Same as the previous month (${data.previousMonthTotal}).`;
  }
  const dir = diff > 0 ? "Up" : "Down";
  return `${dir} ${Math.abs(diff)} from the previous month (${data.previousMonthTotal}).`;
}

function buildHtml(data: AccessibilityReportExport, includeNames: boolean) {
  const monthLabel = formatMonthLabel(data.month);
  const locMax = data.topLocations[0]?.count ?? 0;
  const catMax = data.byCategory[0]?.count ?? 0;

  const highlights: string[] = [];
  if (data.topLocations[0]) {
    highlights.push(
      `Most reported location: <b>${esc(data.topLocations[0].location)}</b> (${data.topLocations[0].count} report${data.topLocations[0].count === 1 ? "" : "s"}).`,
    );
  }
  if (data.byCategory[0]) {
    highlights.push(
      `Most common issue type: <b>${esc(data.byCategory[0].category)}</b> (${data.byCategory[0].count}).`,
    );
  }
  highlights.push(trendText(data));
  if (data.pending > 0) {
    highlights.push(
      `<b>${data.pending}</b> report${data.pending === 1 ? " is" : "s are"} still pending.`,
    );
  }

  const rows = data.reports
    .map(
      (r) => `
      <tr>
        <td class="nowrap">${esc(formatDate(r.createdAt))}</td>
        <td>${esc(r.location)}</td>
        <td>${esc(r.category)}</td>
        <td><span class="badge" style="color:${STATUS_COLOR[r.status]};border-color:${STATUS_COLOR[r.status]}">${esc(STATUS_LABEL[r.status] ?? r.status)}</span></td>
        ${includeNames ? `<td>${esc(r.studentName)}</td>` : ""}
        <td>
          ${esc(r.description)}
          ${r.response ? `<div class="resp">Guidance response: ${esc(r.response)}</div>` : ""}
        </td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>IncluEd Accessibility Report - ${esc(monthLabel)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1b1f24; font-size: 12px; line-height: 1.45; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .brand { font-size: 11px; letter-spacing: 1px; color: #5b6570; font-weight: 700; }
  h1 { font-size: 24px; margin: 4px 0 2px; }
  .meta { color: #5b6570; margin-bottom: 14px; }
  h2 { font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #d5dae0; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .tile { flex: 1 1 28%; min-width: 130px; border: 1px solid #d5dae0; border-radius: 8px; padding: 10px 12px; }
  .tile .n { font-size: 22px; font-weight: 700; }
  .tile .l { color: #5b6570; font-size: 11px; }
  ul.hl { margin: 0; padding-left: 18px; }
  ul.hl li { margin-bottom: 3px; }
  .cols { display: flex; gap: 24px; }
  .cols > div { flex: 1; }
  .bar { margin-bottom: 8px; }
  .bar-top { display: flex; justify-content: space-between; margin-bottom: 3px; }
  .track { height: 8px; background: #e8ebef; border-radius: 99px; overflow: hidden; }
  .fill { height: 100%; border-radius: 99px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: left; font-size: 11px; color: #5b6570; padding: 6px 8px; border-bottom: 2px solid #d5dae0; }
  td { padding: 7px 8px; border-bottom: 1px solid #e8ebef; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .nowrap { white-space: nowrap; }
  .badge { border: 1px solid; border-radius: 99px; padding: 1px 8px; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
  .resp { margin-top: 4px; color: #5b6570; font-style: italic; }
  .empty { color: #5b6570; font-style: italic; }
  .foot { margin-top: 22px; color: #8a949e; font-size: 10.5px; }
</style>
</head>
<body>
  <div class="brand">INCLUED · GUIDANCE OFFICE</div>
  <h1>Accessibility Issues Report</h1>
  <div class="meta">${esc(monthLabel)} · Generated ${esc(formatDate(data.generatedAt))}</div>

  <div class="grid">
    <div class="tile"><div class="n">${data.total}</div><div class="l">Total reports</div></div>
    <div class="tile"><div class="n">${data.resolved}</div><div class="l">Resolved</div></div>
    <div class="tile"><div class="n">${data.inProgress}</div><div class="l">In progress</div></div>
    <div class="tile"><div class="n">${data.pending}</div><div class="l">Pending</div></div>
    <div class="tile"><div class="n">${data.resolutionRate}%</div><div class="l">Resolution rate</div></div>
    <div class="tile"><div class="n">${esc(formatDuration(data.avgResolutionHours))}</div><div class="l">Avg. time to resolve</div></div>
  </div>

  <h2>Highlights</h2>
  <ul class="hl">${highlights.map((h) => `<li>${h}</li>`).join("")}</ul>

  <h2>Status</h2>
  ${bar("Resolved", data.resolved, data.total, STATUS_COLOR.resolved)}
  ${bar("In progress", data.inProgress, data.total, STATUS_COLOR.in_progress)}
  ${bar("Pending", data.pending, data.total, STATUS_COLOR.pending)}

  <div class="cols">
    <div>
      <h2>Most reported locations</h2>
      ${
        data.topLocations.length === 0
          ? `<div class="empty">No reports this month.</div>`
          : data.topLocations
              .map((l) => bar(l.location, l.count, locMax, "#1565c0"))
              .join("")
      }
    </div>
    <div>
      <h2>Issue types</h2>
      ${
        data.byCategory.length === 0
          ? `<div class="empty">No reports this month.</div>`
          : data.byCategory
              .map((c) => bar(c.category, c.count, catMax, "#1565c0"))
              .join("")
      }
    </div>
  </div>

  <h2>Individual reports (${data.reports.length})</h2>
  ${
    data.reports.length === 0
      ? `<div class="empty">No accessibility reports were filed this month.</div>`
      : `<table>
          <thead>
            <tr>
              <th>Date</th><th>Location</th><th>Category</th><th>Status</th>
              ${includeNames ? "<th>Student</th>" : ""}
              <th>Details</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`
  }

  <div class="foot">
    Prepared by the IncluEd Guidance Office.${includeNames ? " This copy includes student names. Handle it as confidential." : " Student names are not included in this copy."}
  </div>
</body>
</html>`;
}

// Returns false when printing isn't available (not running in a browser).
export function printAccessibilityReport(
  data: AccessibilityReportExport,
  includeNames: boolean,
): boolean {
  const doc = (globalThis as any).document;
  if (!doc || !doc.body) return false;

  const existing = doc.getElementById("inclued-report-frame");
  if (existing) existing.remove();

  const iframe = doc.createElement("iframe");
  iframe.id = "inclued-report-frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.border = "0";
  doc.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) return false;

  const idoc = win.document;
  idoc.open();
  idoc.write(buildHtml(data, includeNames));
  idoc.close();

  win.onafterprint = () => {
    setTimeout(() => iframe.remove(), 500);
  };

  setTimeout(() => {
    win.focus();
    win.print();
  }, 350);

  return true;
}
