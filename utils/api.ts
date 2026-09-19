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
    // On web, expo-av gives us a blob: URL — fetch it and attach as a real Blob
    const audioBlob = await (await fetch(fileUri)).blob();
    formData.append("audio", audioBlob, "chunk.webm");
  } else {
    // Native (iOS/Android) — RN's FormData understands this {uri,name,type} shape
    // @ts-ignore — React Native's FormData accepts this shape even though the DOM type doesn't
    formData.append("audio", {
      uri: fileUri,
      name: "chunk.m4a",
      type: "audio/m4a",
    });
  }

  const response = await api.post("/api/transcribe", formData, {
    headers: { "Content-Type": undefined }, // let the platform set its own multipart boundary
  });

  return response.data.text;
};

// 📊 Guidance Dashboard
export const getDashboardStats = async () => {
  const response = await api.get("/api/guidance/stats");
  return response.data;
};

export const getStudents = async (filters?: {
  disability?: string;
  search?: string;
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

export default api;
