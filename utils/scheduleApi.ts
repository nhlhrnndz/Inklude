// utils/scheduleApi.ts
import api from "./api";

export type ScheduleItemType =
  | "class"
  | "exam"
  | "assignment"
  | "appointment"
  | "event"
  | "reminder";

export interface ScheduleItem {
  id: number;
  title: string;
  subject: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  teacherName: string | null;
  type: ScheduleItemType;
  // Set when another module created the item
  // ("session", "appointment", "class_post", "announcement"); null for the
  // student's own.
  sourceType: string | null;
  sourceId: number | null;
}

export interface NewScheduleItem {
  title: string;
  subject?: string;
  teacherName?: string;
  location?: string;
  // "reminder" = personal reminder (single time, no end time). Default: class.
  type?: "class" | "reminder";
  // Local "YYYY-MM-DD HH:MM:SS"
  startTime: string;
  endTime?: string;
  // 1 = just once, up to 12 = repeat every week (classes only)
  repeatWeeks?: number;
}

export interface ClassPost {
  id: number;
  classId: number;
  classTitle: string;
  type: "exam" | "assignment";
  title: string;
  location: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface NewClassPost {
  type: "exam" | "assignment";
  title: string;
  // Local "YYYY-MM-DD HH:MM:SS". For an assignment this is the due time.
  startTime: string;
  endTime?: string;
  location?: string;
}

// ---------- student calendar ----------

export const getTodaySchedule = async (): Promise<{
  items: ScheduleItem[];
}> => {
  const response = await api.get("/api/schedule/today");
  return response.data;
};

export const getWeekSchedule = async (): Promise<{ items: ScheduleItem[] }> => {
  const response = await api.get("/api/schedule/week");
  return response.data;
};

export const getUpcomingSchedule = async (
  days = 45,
): Promise<{ items: ScheduleItem[] }> => {
  const response = await api.get("/api/schedule/upcoming", {
    params: { days },
  });
  return response.data;
};

export const createScheduleItem = async (payload: NewScheduleItem) => {
  const response = await api.post("/api/schedule", payload);
  return response.data;
};

export const deleteScheduleItem = async (id: number) => {
  const response = await api.delete(`/api/schedule/${id}`);
  return response.data;
};

// ---------- teacher: exams and assignments ----------

export const getClassPosts = async (
  classId: number,
): Promise<{ posts: ClassPost[] }> => {
  const response = await api.get(`/api/schedule/class/${classId}/posts`);
  return response.data;
};

export const createClassPost = async (
  classId: number,
  payload: NewClassPost,
): Promise<{ message: string; recipientCount: number; post: ClassPost }> => {
  const response = await api.post(
    `/api/schedule/class/${classId}/posts`,
    payload,
  );
  return response.data;
};

export const deleteClassPost = async (postId: number) => {
  const response = await api.delete(`/api/schedule/class/posts/${postId}`);
  return response.data;
};
