// utils/reportApi.ts
import { Platform } from "react-native";
import { API_URL } from "../constants/config";
import api from "./api";

export const REPORT_CATEGORIES = [
  "Ramp / Entrance",
  "Elevator",
  "Restroom",
  "Classroom",
  "Learning Materials",
  "Transportation",
  "Other",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportStatus = "pending" | "in_progress" | "resolved";

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export interface AccessibilityReport {
  id: number;
  studentId: number;
  studentName: string;
  location: string;
  category: ReportCategory;
  description: string;
  photoUrl: string | null; // e.g. "/uploads/reports/abc.jpg"
  status: ReportStatus;
  response: string;
  handlerName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface ReportStats {
  month: string; // YYYY-MM
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  byCategory: { category: string; count: number }[];
}

// Full URL for an uploaded photo path returned by the server.
export const reportPhotoSource = (photoUrl: string | null) =>
  photoUrl ? `${API_URL}${photoUrl}` : null;

export function reportStatusColor(
  status: ReportStatus,
  colors: { warning: string; primary: string; success: string },
) {
  if (status === "resolved") return colors.success;
  if (status === "in_progress") return colors.primary;
  return colors.warning;
}

export function formatReportDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- student ----------

export const submitAccessibilityReport = async (
  payload: { location: string; category: string; description: string },
  photoUri?: string | null,
) => {
  const form = new FormData();
  form.append("location", payload.location);
  form.append("category", payload.category);
  form.append("description", payload.description);

  if (photoUri) {
    if (Platform.OS === "web") {
      const blob = await (await fetch(photoUri)).blob();
      form.append("photo", blob, "report.jpg");
    } else {
      const name = photoUri.split("/").pop() || "report.jpg";
      const ext = name.split(".").pop()?.toLowerCase();
      const type =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
      // @ts-ignore — React Native's FormData accepts this shape
      form.append("photo", { uri: photoUri, name, type });
    }
  }

  const response = await api.post("/api/reports", form, {
    headers: { "Content-Type": undefined },
    timeout: 60000, // photos can take longer than the default 15s
  });
  return response.data as { message: string; report: AccessibilityReport };
};

export const getMyReports = async () => {
  const response = await api.get("/api/reports/mine");
  return response.data as { reports: AccessibilityReport[] };
};

// ---------- guidance ----------

export const getGuidanceReports = async (status?: ReportStatus) => {
  const response = await api.get("/api/reports", { params: { status } });
  return response.data as { reports: AccessibilityReport[] };
};

export const getReportStats = async (month?: string) => {
  const response = await api.get("/api/reports/stats", { params: { month } });
  return response.data as ReportStats;
};

export const updateReportStatus = async (
  id: number,
  payload: { status: ReportStatus; response?: string },
) => {
  const response = await api.patch(`/api/reports/${id}/status`, payload);
  return response.data as { message: string; report: AccessibilityReport };
};
