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

// ===== Class Experience (before / after class check-in) =====

// 1 = Difficult, 2 = Okay, 3 = Good
export type PulseMood = 1 | 2 | 3;

export type ExperiencePhase = "before" | "after";

export interface PulseCounts {
  sad: number; // Difficult
  okay: number;
  happy: number; // Good
}

export interface PulsePhaseSummary {
  responded: number;
  hidden: boolean;
  counts: PulseCounts | null;
}

// The session summary screen reads this name.
export type PulseSummary = PulsePhaseSummary;

export interface SessionExperience {
  before: PulsePhaseSummary;
  after: PulsePhaseSummary;
}

export interface ClassInsights {
  minResponses: number;
  overview: SessionExperience;
  sessions: {
    id: number;
    title: string;
    scheduledStart: string | null;
    before: PulsePhaseSummary;
    after: PulsePhaseSummary;
  }[];
}

export interface DueExperience {
  sessionId: number;
  sessionTitle: string;
  phase: ExperiencePhase;
}

// Student: which check-in (if any) is open for this session right now?
export const getDueExperienceForSession = async (
  sessionId: number,
): Promise<{ due: DueExperience | null }> => {
  const response = await api.get(`/api/class-pulse/session/${sessionId}/due`);
  return response.data;
};

// Student: which check-in (if any) is open for this class right now?
export const getDueExperienceForClass = async (
  classId: number,
): Promise<{ due: DueExperience | null }> => {
  const response = await api.get(`/api/class-pulse/class/${classId}/due`);
  return response.data;
};

export const submitExperience = async (payload: {
  sessionId: number;
  phase: ExperiencePhase;
  mood: PulseMood;
}) => {
  const response = await api.post("/api/class-pulse", payload);
  return response.data;
};

// Teacher: one session (summary = the after-class answers)
export const getPulseSummary = async (
  sessionId: number,
): Promise<{ summary: PulseSummary; phases: SessionExperience }> => {
  const response = await api.get(
    `/api/class-pulse/session/${sessionId}/summary`,
  );
  return response.data;
};

// Teacher: a whole class
export const getClassInsights = async (
  classId: number,
): Promise<ClassInsights> => {
  const response = await api.get(`/api/class-pulse/class/${classId}/insights`);
  return response.data;
};
