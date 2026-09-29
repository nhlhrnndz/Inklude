// utils/scheduleApi.ts
import api from "./api";

export interface ScheduleItem {
  id: number;
  title: string;
  subject: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  teacherName: string | null;
}

export interface NewScheduleItem {
  title: string;
  subject?: string;
  teacherName?: string;
  location?: string;
  // Local "YYYY-MM-DD HH:MM:SS"
  startTime: string;
  endTime: string;
  // 1 = just once, up to 12 = repeat every week
  repeatWeeks?: number;
}

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

export const createScheduleItem = async (payload: NewScheduleItem) => {
  const response = await api.post("/api/schedule", payload);
  return response.data;
};

export const deleteScheduleItem = async (id: number) => {
  const response = await api.delete(`/api/schedule/${id}`);
  return response.data;
};
