// utils/belongingApi.ts
import api from "./api";

export type OutreachMode = "template" | "edited" | "custom";

export type BelongingFlagReason = {
  key: string;
  label: string;
};

export type BelongingSnapshot = {
  studentId: number;
  windowDays: number;
  recentSessions: {
    attended: number;
    withPresenceTap: number;
    totalTaps: number;
  };
  pulse: {
    answered: number;
    sad: number;
    okay: number;
    happy: number;
  };
  peerShares: {
    enabled: boolean;
    sent: number;
    received: number;
  };
  checkins: {
    received: number;
    replied: number;
    latestAt: string | null;
  };
  flag: {
    flagged: boolean;
    level: "ok" | "watch" | "high";
    reasons: BelongingFlagReason[];
  };
};

export type OutreachItem = {
  id: number;
  mode: OutreachMode;
  templateKey: string | null;
  sentAt: string;
  guidanceName: string;
  body: string | null;
};

export type StudentBelongingResponse = {
  belonging: BelongingSnapshot;
  outreach: OutreachItem[];
};

export const getStudentBelonging = async (
  studentId: number,
): Promise<StudentBelongingResponse> => {
  const response = await api.get(
    `/api/guidance/students/${studentId}/belonging`,
  );
  return response.data;
};

export const sendReachOut = async (
  studentId: number,
  payload: {
    body: string;
    mode: OutreachMode;
    templateKey: string | null;
  },
): Promise<{ message: string; threadId: number; outreach: OutreachItem[] }> => {
  const response = await api.post(
    `/api/guidance/students/${studentId}/reach-out`,
    payload,
  );
  return response.data;
};

// =========================
// Cohort overview (Belonging tab)
// =========================

export type BelongingTrendPoint = {
  weeksAgo: number;
  label: string;
  checkins: number;
  taps: number;
  peerShares: number;
  pulseAvg: number | null;
};

export type BelongingListedStudent = {
  id: number;
  name: string;
  course: string | null;
  yearLevel: string | null;
  level: "watch" | "high";
  reasonCount: number;
  topReason: string | null;
};

export type BelongingOverview = {
  generatedAt: string;
  peerSharingEnabled: boolean;
  interactionWindowDays: number;
  totals: {
    students: number;
    flagged: number;
    high: number;
    watch: number;
    zeroInteraction: number;
  };
  thisWeek: {
    checkinsSent: number;
    checkinsReplied: number;
    peerShares: number;
    pulse: {
      responded: number;
      hidden: boolean;
      average: number | null;
      counts: { sad: number; okay: number; happy: number } | null;
    };
  };
  trend: BelongingTrendPoint[];
  flaggedStudents: BelongingListedStudent[];
};

export const getBelongingOverview = async (
  forceRefresh = false,
): Promise<BelongingOverview> => {
  const response = await api.get("/api/guidance/belonging/overview", {
    params: forceRefresh ? { refresh: 1 } : undefined,
    // The overview does a lot of queries, so allow more than the 15s default.
    timeout: 45000,
  });
  return response.data;
};
