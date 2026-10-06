// utils/classApi.ts
import api from "./api";

export interface TeacherStudent {
  id: number;
  displayName: string;
  initials: string;
  avatarColor: string;
  classes: { id: number; title: string }[];
  hasAccommodationRequest: boolean;
  openRequestCount: number;
}

// Teacher: students enrolled in my classes (no disability or SIS data)
export const getMyStudents = async () => {
  const response = await api.get("/api/classes/my-students");
  return response.data as { students: TeacherStudent[] };
};

// ===== Teacher -> Guidance referral =====

export const REFERRAL_CATEGORIES = [
  "Struggling academically",
  "Attendance concerns",
  "Seems withdrawn or distressed",
  "Communication difficulty",
  "Accessibility barrier in class",
  "Other",
] as const;

export type SentReferralStatus = "sent" | "acknowledged" | "completed";

export interface SentReferral {
  id: number;
  studentId: number;
  classId: number;
  classTitle: string;
  concern: string;
  note: string;
  alreadySpoke: boolean | null;
  status: SentReferralStatus;
  createdAt: string;
  updatedAt: string;
}

export const referStudentToGuidance = async (payload: {
  studentId: number;
  classId: number;
  concern: string;
  note?: string;
  alreadySpoke: boolean;
}) => {
  const response = await api.post("/api/referrals/to-guidance", payload);
  return response.data as { message: string; referral: SentReferral };
};

export const getSentReferrals = async () => {
  const response = await api.get("/api/referrals/sent");
  return response.data as { referrals: SentReferral[] };
};
