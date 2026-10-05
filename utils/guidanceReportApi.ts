// utils/guidanceReportApi.ts
import api from "./api";

export type ExportReportStatus = "pending" | "in_progress" | "resolved";

export interface AccessibilityReportExport {
  month: string; // YYYY-MM
  generatedAt: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  resolutionRate: number; // percent
  avgResolutionHours: number | null;
  previousMonthTotal: number;
  byCategory: { category: string; count: number }[];
  topLocations: { location: string; count: number }[];
  reports: {
    id: number;
    location: string;
    category: string;
    description: string;
    status: ExportReportStatus;
    response: string;
    studentName: string;
    createdAt: string;
    resolvedAt: string | null;
  }[];
}

export const getAccessibilityReportData = async (month: string) => {
  const response = await api.get("/api/guidance/reports/accessibility", {
    params: { month },
  });
  return response.data as AccessibilityReportExport;
};
