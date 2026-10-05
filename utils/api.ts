// utils/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { API_URL } from "../constants/config";

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
  deadline?: string;
  audience?: "college";
  colleges?: string[];
  courses?: string[];
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

export async function getClassAnnouncements(classId: number) {
  const res = await api.get(`/api/announcements/class/${classId}`);
  return res.data;
}

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
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// Student: send a message to guidance
export const sendMyMessage = async (payload: {
  body: string;
}): Promise<MessageThreadDetail> => {
  const response = await api.post("/api/messages/mine", payload);
  return response.data;
};

// Student: get my own thread with guidance
export const getMyMessages = async (): Promise<MessageThreadDetail> => {
  const response = await api.get("/api/messages/mine");
  return response.data;
};

// Guidance: inbox list of threads
export const getGuidanceInbox = async (filters?: {
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

// =========================
// Classes (Phase 4 Week 3)
// =========================

export interface ClassSchedule {
  days: number[]; // 0 = Sunday ... 6 = Saturday
  startTime: string; // "HH:MM" 24-hour
  endTime: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
}

export interface ClassSummary {
  id: number;
  code: string;
  title: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
  teacherName?: string;
  memberCount: number;
  sessionCount: number;
  isLive: boolean;
  liveSessionId: number | null;
  accommodationCount: number;
  isOwner?: boolean;
  schedule: ClassSchedule | null;
}

export interface ClassSession {
  id: number;
  code: string;
  title: string;
  status: "active" | "ended";
  isLive: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string;
  endedAt: string | null;
  participantCount: number;
}

export interface ClassMember {
  id: number;
  displayName: string;
  initials: string;
  avatarColor: string;
  joinedAt: string;
}

export const createClass = async (
  title: string,
  description?: string,
  schedule?: ClassSchedule,
) => {
  const response = await api.post("/api/classes", {
    title,
    description,
    schedule,
  });
  return response.data as {
    message: string;
    class: ClassSummary;
    sessionCount: number;
  };
};

// Teacher: today's session for this class (created on the spot if needed)
export const openClassSession = async (classId: number) => {
  const response = await api.post(`/api/classes/${classId}/open-session`);
  return response.data as { sessionId: number };
};

export const getMyClasses = async () => {
  const response = await api.get("/api/classes");
  return response.data as { classes: ClassSummary[] };
};

export const joinClassByCode = async (code: string) => {
  const response = await api.post("/api/classes/join", {
    code: code.toUpperCase(),
  });
  return response.data as { message: string; class: ClassSummary };
};

export const getClassDetails = async (classId: number) => {
  const response = await api.get(`/api/classes/${classId}`);
  return response.data as { class: ClassSummary; sessions: ClassSession[] };
};

export const getClassMembers = async (classId: number) => {
  const response = await api.get(`/api/classes/${classId}/members`);
  return response.data as { members: ClassMember[] };
};

export const createClassSession = async (
  classId: number,
  payload: { title?: string; scheduledStart?: string; scheduledEnd?: string },
) => {
  const response = await api.post(`/api/classes/${classId}/sessions`, payload);
  return response.data as { message: string; session: ClassSession };
};

export const leaveClass = async (classId: number) => {
  const response = await api.post(`/api/classes/${classId}/leave`);
  return response.data;
};

// Student walks into a session → marked present
export const enterSession = async (sessionId: number) => {
  const response = await api.post(`/api/sessions/${sessionId}/enter`);
  return response.data;
};

// =========================
// Accommodation Requests (Phase 4 Week 5A)
// =========================

export type AccommodationType =
  | "front_seating"
  | "more_time"
  | "additional_materials"
  | "extra_help"
  | "other";

export type AccommodationStatus =
  | "pending"
  | "approved"
  | "declined"
  | "discuss"
  | "cancelled";

export type AccommodationDecision = "approved" | "declined" | "discuss";

export const ACCOMMODATION_TYPE_OPTIONS: {
  key: AccommodationType;
  label: string;
}[] = [
  { key: "front_seating", label: "Front seating" },
  { key: "more_time", label: "More time" },
  { key: "additional_materials", label: "Additional materials" },
  { key: "extra_help", label: "Extra help" },
  { key: "other", label: "Other" },
];

export interface AccommodationRequest {
  id: number;
  classId: number;
  type: AccommodationType;
  typeLabel: string;
  note: string;
  status: AccommodationStatus;
  teacherResponse: string;
  respondedAt: string | null;
  createdAt: string;
  // Teacher view only
  studentName?: string;
  studentInitials?: string;
}

// Student: send a request
export const createAccommodationRequest = async (
  classId: number,
  payload: { type: AccommodationType; note?: string },
) => {
  const response = await api.post(
    `/api/accommodations/classes/${classId}`,
    payload,
  );
  return response.data as { message: string; request: AccommodationRequest };
};

// Student: my requests in a class
export const getMyAccommodationRequests = async (classId: number) => {
  const response = await api.get(`/api/accommodations/classes/${classId}/mine`);
  return response.data as { requests: AccommodationRequest[] };
};

// Student: withdraw an open request
export const cancelAccommodationRequest = async (requestId: number) => {
  const response = await api.patch(`/api/accommodations/${requestId}/cancel`);
  return response.data as { message: string };
};

// Teacher: every request in a class
export const getClassAccommodationRequests = async (classId: number) => {
  const response = await api.get(`/api/accommodations/classes/${classId}`);
  return response.data as { requests: AccommodationRequest[] };
};

// Teacher: approve / decline / discuss
export const respondToAccommodationRequest = async (
  requestId: number,
  payload: { decision: AccommodationDecision; reason?: string },
) => {
  const response = await api.patch(
    `/api/accommodations/${requestId}/respond`,
    payload,
  );
  return response.data as { message: string; request: AccommodationRequest };
};

// =========================
// Guidance Appointments (Phase 4 Week 6)
// =========================

export type AppointmentReason =
  | "Academic"
  | "Social"
  | "Adjustment"
  | "Accessibility"
  | "Personal"
  | "Other";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "declined"
  | "cancelled"
  | "completed";

export const APPOINTMENT_REASONS: AppointmentReason[] = [
  "Academic",
  "Social",
  "Adjustment",
  "Accessibility",
  "Personal",
  "Other",
];

export interface Appointment {
  id: number;
  studentId: number;
  studentName?: string;
  studentEmail?: string;
  guidanceName: string | null;
  reason: AppointmentReason;
  note: string;
  status: AppointmentStatus;
  preferredDate: string; // YYYY-MM-DD
  preferredTime: string; // HH:MM
  confirmedDate: string | null;
  confirmedTime: string | null;
  guidanceNote: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentAction = "confirm" | "decline" | "cancel" | "complete";

// Student
export const requestAppointment = async (payload: {
  reason: AppointmentReason;
  note?: string;
  preferredDate: string;
  preferredTime: string;
}) => {
  const response = await api.post("/api/appointments", payload);
  return response.data as { message: string; appointment: Appointment };
};

export const getMyAppointments = async () => {
  const response = await api.get("/api/appointments/mine");
  return response.data as { appointments: Appointment[] };
};

export const cancelMyAppointment = async (id: number) => {
  const response = await api.patch(`/api/appointments/${id}/cancel`);
  return response.data as { message: string };
};

// Guidance
export const getGuidanceAppointments = async () => {
  const response = await api.get("/api/appointments");
  return response.data as { appointments: Appointment[] };
};

export const respondToAppointment = async (
  id: number,
  payload: {
    action: AppointmentAction;
    date?: string;
    time?: string;
    note?: string;
  },
) => {
  const response = await api.patch(`/api/appointments/${id}/respond`, payload);
  return response.data as { message: string; appointment: Appointment };
};

// =========================
// Guidance Dashboard + Follow-ups (Phase 4 Week 7)
// =========================

export type FollowupReason =
  | "Accessibility concern"
  | "Repeated class difficulty"
  | "Academic concern"
  | "Adjustment"
  | "Personal concern"
  | "Other";

export const FOLLOWUP_REASONS: FollowupReason[] = [
  "Accessibility concern",
  "Repeated class difficulty",
  "Academic concern",
  "Adjustment",
  "Personal concern",
  "Other",
];

export interface Followup {
  id: number;
  studentId: number;
  studentName: string;
  reason: FollowupReason;
  note: string;
  status: "active" | "completed";
  createdAt: string;
  createdByName: string | null;
  completedAt: string | null;
  completedByName: string | null;
  completionNote: string;
}

export interface GuidanceDashboardSummary {
  totalStudents: number;
  appointments: {
    pendingCount: number;
    upcomingCount: number;
    next: {
      id: number;
      studentId: number;
      studentName: string;
      reason: AppointmentReason;
      status: AppointmentStatus;
      date: string; // YYYY-MM-DD
      time: string; // HH:MM
    } | null;
  };
  followups: {
    activeCount: number;
    items: Followup[];
  };
  messages: {
    unreadTotal: number;
    threads: {
      id: number;
      studentId: number;
      studentName: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }[];
  };
  announcements: {
    id: number;
    title: string;
    audience: string;
    createdAt: string;
  }[];
  sis: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    incompleteStudentIds: number[];
  };
}

export const getGuidanceDashboard = async () => {
  const response = await api.get("/api/guidance/dashboard");
  return response.data as GuidanceDashboardSummary;
};

export const getStudentFollowups = async (studentId: number) => {
  const response = await api.get(
    `/api/guidance/students/${studentId}/followups`,
  );
  return response.data as { followups: Followup[] };
};

export const createStudentFollowup = async (
  studentId: number,
  payload: { reason: FollowupReason; note?: string },
) => {
  const response = await api.post(
    `/api/guidance/students/${studentId}/followups`,
    payload,
  );
  return response.data as { message: string; followup: Followup };
};

export const completeFollowup = async (
  followupId: number,
  payload?: { note?: string },
) => {
  const response = await api.patch(
    `/api/guidance/followups/${followupId}/complete`,
    payload ?? {},
  );
  return response.data as { message: string; followup: Followup };
};

// =========================
// Guidance Support Referrals (Phase 4 Week 7)
// =========================

export type ReferralConcern =
  | "Accessibility concern"
  | "Class participation"
  | "Academic difficulty"
  | "Communication support"
  | "Other";

export const REFERRAL_CONCERNS: ReferralConcern[] = [
  "Accessibility concern",
  "Class participation",
  "Academic difficulty",
  "Communication support",
  "Other",
];

export type ReferralStatus = "sent" | "acknowledged" | "responded";

export interface SupportReferral {
  id: number;
  studentId: number;
  studentName: string;
  classId: number;
  classTitle: string;
  classCode: string;
  concern: ReferralConcern;
  note: string;
  status: ReferralStatus;
  guidanceName: string | null;
  teacherName: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  teacherResponse: string;
  respondedAt: string | null;
}

export interface ReferralClass {
  id: number;
  title: string;
  code: string;
  teacherName: string;
}

// Guidance
export const getReferralClassesForStudent = async (studentId: number) => {
  const response = await api.get(`/api/referrals/student/${studentId}/classes`);
  return response.data as { classes: ReferralClass[] };
};

export const getStudentReferrals = async (studentId: number) => {
  const response = await api.get(`/api/referrals/student/${studentId}`);
  return response.data as { referrals: SupportReferral[] };
};

export const sendSupportReferral = async (payload: {
  studentId: number;
  classId: number;
  concern: ReferralConcern;
  note?: string;
}) => {
  const response = await api.post("/api/referrals", payload);
  return response.data as { message: string; referral: SupportReferral };
};

// Teacher
export const getMyReferrals = async () => {
  const response = await api.get("/api/referrals/mine");
  return response.data as { referrals: SupportReferral[] };
};

export const acknowledgeReferral = async (id: number) => {
  const response = await api.patch(`/api/referrals/${id}/acknowledge`);
  return response.data as { message: string; referral: SupportReferral };
};

export const respondToReferral = async (id: number, message: string) => {
  const response = await api.patch(`/api/referrals/${id}/respond`, { message });
  return response.data as { message: string; referral: SupportReferral };
};
