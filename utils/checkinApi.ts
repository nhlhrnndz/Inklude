// utils/checkinApi.ts
import api from "./api";

// ===== Check-ins =====

export const CHECKIN_REPLIES = [
  "I'm okay",
  "I need help",
  "I'll talk to guidance",
] as const;

export interface QuietStudent {
  id: number;
  name: string;
  quietStreak: number;
  checkedIn: boolean;
}

export interface QuietStudentsResponse {
  session: { id: number; title: string; endedAt: string | null };
  participantCount: number;
  minStreak: number;
  quietStudents: QuietStudent[];
}

export interface CheckinItem {
  id: number;
  teacherId: number;
  studentId: number;
  sessionId: number | null;
  message: string;
  reply: string | null;
  sentAt: string;
  repliedAt: string | null;
  teacherName?: string;
  studentName?: string;
}

export const getQuietStudents = async (
  sessionId: number,
): Promise<QuietStudentsResponse> => {
  const response = await api.get(`/api/checkins/session/${sessionId}/quiet`);
  return response.data;
};

export const sendCheckin = async (payload: {
  studentId: number;
  sessionId: number;
  message: string;
}): Promise<{ message: string; checkin: CheckinItem }> => {
  const response = await api.post("/api/checkins", payload);
  return response.data;
};

export const getSentCheckins = async (): Promise<{
  checkins: CheckinItem[];
}> => {
  const response = await api.get("/api/checkins/sent");
  return response.data;
};

export const getReceivedCheckins = async (): Promise<{
  checkins: CheckinItem[];
}> => {
  const response = await api.get("/api/checkins/received");
  return response.data;
};

export const replyToCheckin = async (
  checkinId: number,
  reply: string,
): Promise<{ message: string; checkin: CheckinItem }> => {
  const response = await api.post(`/api/checkins/${checkinId}/reply`, {
    reply,
  });
  return response.data;
};

// ===== Class Pulse =====

// 1 = 😞, 2 = 😐, 3 = 😀
export type PulseMood = 1 | 2 | 3;

export interface PulseSummary {
  responded: number;
  hidden: boolean;
  counts: { sad: number; okay: number; happy: number } | null;
}

export const submitClassPulse = async (sessionId: number, mood: PulseMood) => {
  const response = await api.post("/api/class-pulse", { sessionId, mood });
  return response.data;
};

export const getMyPulseStatus = async (
  sessionId: number,
): Promise<{ submitted: boolean }> => {
  const response = await api.get(`/api/class-pulse/${sessionId}/mine`);
  return response.data;
};

export const getPulseSummary = async (
  sessionId: number,
): Promise<{ summary: PulseSummary }> => {
  const response = await api.get(`/api/class-pulse/${sessionId}/summary`);
  return response.data;
};
