// utils/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import { API_URL } from "../constants/config";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // never hang forever — fail loudly after 15s instead
  headers: {
    "Content-Type": "application/json",
  },
});

// In-memory copy of the JWT. Reading AsyncStorage on every single request
// is the usual cause of requests silently hanging after a screen
// transition/reload in Expo Go — AuthContext keeps this in sync via
// setCachedToken()/clearCachedToken() on login/logout/app-start, so most
// requests never have to touch AsyncStorage at all.
let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export function clearCachedToken() {
  cachedToken = null;
}

// Attach the JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  let token = cachedToken;
  if (!token) {
    token = await AsyncStorage.getItem("token");
    if (token) cachedToken = token;
  }
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

// 🏷️ Set/clear the student's peer-facing display username (Phase 2.3 1.3).
// Pass null or "" to clear it and fall back to "First L." in rosters.
export const updateMyUsername = async (username: string | null) => {
  const response = await api.patch("/api/profile/username", { username });
  return response.data; // { message, displayUsername }
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

export async function getSessionRoster(sessionId: number) {
  const res = await api.get(`/api/sessions/${sessionId}/participants`);
  return res.data; // { participants: [{ id, displayName, initials, avatarColor }] }
}

// 📄 Download a session's PDF report (web: browser download, native: share sheet)
export const downloadSessionReport = async (
  sessionId: number,
  sessionTitle: string,
) => {
  const token = await AsyncStorage.getItem("token");
  const url = `${API_URL}/api/sessions/${sessionId}/report`;

  const safeTitle = sessionTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `session-${sessionId}-${safeTitle}.pdf`;

  if (Platform.OS === "web") {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to download report.");
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return;
  }

  // Native (Expo Go / dev build)
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (downloadResult.status !== 200) {
    throw new Error("Failed to download report.");
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Session Report",
    });
  }
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

// Basic Information (Course / Year Level / Section / Date of Birth) is the
// single source of truth. The backend merges it into every SIS response
// under `basicInfo` so the SIS screen can show those fields read-only.
export type SISBasicInfo = {
  yearLevel?: string;
  age?: number;
  dateOfBirth?: string;
  course?: string;
  section?: string;
};

export const getMySIS = async (): Promise<{
  sis: SISData | null;
  status: SISStatus;
  basicInfo: SISBasicInfo | null;
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
  basicInfo: SISBasicInfo | null;
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
  basicInfo: SISBasicInfo | null;
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

export const getGuidanceStudentSIS = async (
  studentId: number,
): Promise<{
  sis: SISData | null;
  status: SISStatus;
  basicInfo: SISBasicInfo | null;
}> => {
  const response = await api.get(`/api/sis/students/${studentId}`);
  return response.data;
};

export default api;

// =========================
// Student ↔ Guidance Messaging
// =========================

export type MessageCategory = "help" | "complaint" | "concern";
export type MessageThreadStatus = "open" | "in_progress" | "resolved";

export interface MessageItem {
  id: number;
  senderId: number;
  senderRole: "student" | "guidance";
  senderName?: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface MessageThreadInfo {
  id: number;
  studentId: number;
  studentName?: string;
  studentEmail?: string;
  category: MessageCategory;
  urgent: boolean;
  status: MessageThreadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MessageThreadDetail {
  thread: MessageThreadInfo | null;
  messages: MessageItem[];
}

export interface MessageThreadSummary {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  category: MessageCategory;
  urgent: boolean;
  status: MessageThreadStatus;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// Student: send a message to guidance (creates or continues their thread)
export const sendMyMessage = async (payload: {
  body: string;
  category?: MessageCategory;
  urgent?: boolean;
}): Promise<MessageThreadDetail> => {
  const response = await api.post("/api/messages/mine", payload);
  return response.data;
};

// Student: get my own thread with guidance
export const getMyMessages = async (): Promise<MessageThreadDetail> => {
  const response = await api.get("/api/messages/mine");
  return response.data;
};

// Guidance: inbox list of threads, with filters
export const getGuidanceInbox = async (filters?: {
  category?: MessageCategory;
  urgent?: boolean;
  status?: MessageThreadStatus;
  search?: string;
}): Promise<{ threads: MessageThreadSummary[] }> => {
  const response = await api.get("/api/messages", { params: filters });
  return response.data;
};

// Guidance: open a specific thread
export const getGuidanceThread = async (
  threadId: number,
): Promise<MessageThreadDetail> => {
  const response = await api.get(`/api/messages/${threadId}`);
  return response.data;
};

// Guidance: reply in a thread
export const replyToThread = async (
  threadId: number,
  body: string,
): Promise<MessageThreadDetail> => {
  const response = await api.post(`/api/messages/${threadId}/reply`, { body });
  return response.data;
};

// Guidance: update a thread's status
export const updateThreadStatus = async (
  threadId: number,
  status: MessageThreadStatus,
): Promise<{ message: string; status: MessageThreadStatus }> => {
  const response = await api.patch(`/api/messages/${threadId}/status`, {
    status,
  });
  return response.data;
};
