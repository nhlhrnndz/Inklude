// utils/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import { API_URL } from "../constants/config";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getMyProfile = async () => {
  const response = await api.get("/api/profile");
  return response.data;
};

export const saveMyProfile = async (
  disabilityTypes: string[],
  accessibilityPreferences: Record<string, boolean>,
) => {
  const response = await api.post("/api/profile", {
    disabilityTypes,
    accessibilityPreferences,
  });
  return response.data;
};

// ✏️ Update the logged-in user's own basic account info (name/email)
export const updateProfileInfo = async (name: string, email: string) => {
  const response = await api.put("/api/auth/profile", { name, email });
  return response.data;
};

// 🔒 Change the logged-in user's password
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  const response = await api.put("/api/auth/password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};

export const createSession = async (title: string, description?: string) => {
  const response = await api.post("/api/sessions", { title, description });
  return response.data;
};

export const getMySessions = async () => {
  const response = await api.get("/api/sessions");
  return response.data;
};

export const getSessionDetails = async (sessionId: number) => {
  const response = await api.get(`/api/sessions/${sessionId}`);
  return response.data;
};

export const joinSessionByCode = async (code: string) => {
  const response = await api.get(`/api/sessions/join/${code.toUpperCase()}`);
  return response.data;
};

export const endSession = async (sessionId: number) => {
  const response = await api.delete(`/api/sessions/${sessionId}`);
  return response.data;
};

// 🎙 Send a recorded audio chunk to the backend for Whisper transcription
export const transcribeAudioChunk = async (
  fileUri: string,
): Promise<string> => {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const audioBlob = await (await fetch(fileUri)).blob();
    formData.append("audio", audioBlob, "chunk.webm");
  } else {
    // @ts-ignore — React Native's FormData accepts this shape even though the DOM type doesn't
    formData.append("audio", {
      uri: fileUri,
      name: "chunk.m4a",
      type: "audio/m4a",
    });
  }

  const response = await api.post("/api/transcribe", formData, {
    headers: { "Content-Type": undefined },
  });

  return response.data.text;
};

// 🖥️ Classroom Viewboard: catch-up on recent transcript lines when
// opening mid-class or after a reconnect.
export const getSessionTranscripts = async (sessionId: number) => {
  const response = await api.get(`/api/transcripts/${sessionId}`);
  return response.data;
};

// 📊 Guidance Dashboard
export const getDashboardStats = async () => {
  const response = await api.get("/api/guidance/stats");
  return response.data;
};

export const getStudents = async (filters?: {
  disability?: string;
  search?: string;
  course?: string;
  section?: string;
  yearLevel?: string;
}) => {
  const response = await api.get("/api/guidance/students", {
    params: filters,
  });
  return response.data;
};

export const getStudentDetail = async (studentId: number) => {
  const response = await api.get(`/api/guidance/students/${studentId}`);
  return response.data;
};

// 🔔 Notifications
export const getNotifications = async (params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) => {
  const response = await api.get("/api/notifications", { params });
  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await api.get("/api/notifications/unread-count");
  return response.data;
};

export const markNotificationRead = async (notificationId: number) => {
  const response = await api.patch(`/api/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch("/api/notifications/read-all");
  return response.data;
};

// 📢 Announcements (teacher / guidance)
export const postAnnouncement = async (payload: {
  title: string;
  body: string;
  sessionId?: number;
}) => {
  const response = await api.post("/api/announcements", payload);
  return response.data;
};

export const getMyAnnouncements = async () => {
  const response = await api.get("/api/announcements/mine");
  return response.data;
};

export const getSessionAnnouncements = async (sessionId: number) => {
  const response = await api.get(`/api/announcements/session/${sessionId}`);
  return response.data;
};

// =========================
// Basic Information (mandatory onboarding step)
// =========================

export interface BasicInfoData {
  id?: number;
  userId?: number;
  yearLevel: string;
  age: number | string;
  dateOfBirth: string;
  course: string;
  section: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getMyBasicInfo = async (): Promise<BasicInfoData> => {
  const response = await api.get("/api/basic-info");
  return response.data;
};

export const saveMyBasicInfo = async (
  data: BasicInfoData,
): Promise<{ message: string; basicInfo: BasicInfoData }> => {
  const response = await api.post("/api/basic-info", data);
  return response.data;
};

// =========================
// SIS
// =========================

export type SISStatus = "not_started" | "in_progress" | "completed";

export interface SISData {
  id?: number;
  userId?: number;

  studentId: string;
  fullName: string;
  dateOfBirth: string;
  sex: string;
  civilStatus: string;
  nationality: string;

  email: string;
  mobileNumber: string;
  currentAddress: string;
  permanentAddress: string;

  programCourse: string;
  yearLevel: string;
  sectionBlock: string;
  academicYear: string;

  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactNumber: string;
  emergencyContactAddress: string;

  parentGuardianName: string;
  parentGuardianRelationship: string;
  parentGuardianContact: string;
  parentGuardianOccupation: string;

  preferredCommunicationMethod: string;
  learningCommunicationPreferences: string;
  additionalSupportNotes: string;

  status: SISStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const getMySIS = async (): Promise<{
  sis: SISData | null;
  status: SISStatus;
}> => {
  const response = await api.get("/api/sis/me");
  return response.data;
};

export const saveMySIS = async (
  data: SISData,
): Promise<{
  message: string;
  sis: SISData;
  status: SISStatus;
}> => {
  const response = await api.post("/api/sis/me", data);
  return response.data;
};

export const updateMySIS = async (
  data: SISData,
): Promise<{
  message: string;
  sis: SISData;
  status: SISStatus;
}> => {
  const response = await api.put("/api/sis/me", data);
  return response.data;
};

export const getGuidanceSIS = async (filters?: {
  status?: SISStatus;
  search?: string;
}) => {
  const response = await api.get("/api/sis/students", {
    params: filters,
  });

  return response.data;
};

export const getGuidanceStudentSIS = async (studentId: number) => {
  const response = await api.get(`/api/sis/students/${studentId}`);
  return response.data;
};

export default api;
