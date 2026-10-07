// utils/guidanceReferralApi.ts
// Guidance side of Teacher -> Guidance referrals.
import api from "./api";

export type TeacherReferralStatus =
  | "sent"
  | "acknowledged"
  | "in_progress"
  | "completed";

export interface TeacherReferral {
  id: number;
  studentId: number;
  studentName: string;
  classId: number;
  classTitle: string;
  classCode: string;
  direction: string;
  concern: string;
  note: string;
  alreadySpoke: boolean | null;
  status: TeacherReferralStatus;
  guidanceName: string | null;
  teacherName: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  guidanceNote: string;
  completedAt: string | null;
}

export const getTeacherReferrals = async (status?: TeacherReferralStatus) => {
  const response = await api.get("/api/referrals/teacher-referrals", {
    params: status ? { status } : undefined,
  });
  return response.data as { referrals: TeacherReferral[] };
};

export const updateTeacherReferralStatus = async (
  id: number,
  status: Exclude<TeacherReferralStatus, "sent">,
  note?: string,
) => {
  const response = await api.patch(`/api/referrals/${id}/guidance-status`, {
    status,
    note,
  });
  return response.data as { message: string; referral: TeacherReferral };
};
