import api from "./api";

export interface GuidanceDashboardData {
  totalStudents: number;

  appointments: {
    pendingCount: number;
    upcomingCount: number;
    next: {
      id: number;
      studentId: number;
      studentName: string;
      reason: string;
      status: string;
      date: string;
      time: string;
    } | null;
  };

  followups: {
    activeCount: number;
    items: {
      id: number;
      studentId: number;
      studentName: string;
      reason: string;
      createdAt: string;
    }[];
  };

  messages: {
    unreadTotal: number;
  };

  supportStatus: {
    total: number;
    followUp: number;
    appointmentPending: number;
    awaitingReply: number;
    noOpenItems: number;
  };

  needsAttention: {
    followups: number;
    pendingAppointments: number;
    unansweredMessages: number;
    pendingReports: number;
    appointmentsToday: number;
    needsHelp: number;
  };

  needsHelpStudents: {
    id: number;
    name: string;
    count: number;
    latestAt: string | null;
  }[];

  today: {
    id: number;
    studentId: number;
    studentName: string;
    reason: string;
    status: string;
    time: string;
  }[];

  accessibility: {
    month: string;
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    topLocations: {
      location: string;
      count: number;
    }[];
    topCategories: {
      category: string;
      count: number;
    }[];
  };

  activity: {
    weeks: {
      start: string;
      appointments: number;
      messages: number;
      reports: number;
      total: number;
    }[];
  };
}

export const getGuidanceDashboardData = async () => {
  const response = await api.get("/api/guidance/dashboard");

  return response.data as GuidanceDashboardData;
};

export interface PwdStats {
  totalPwd: number;

  byCollege: {
    college: string;
    total: number;
  }[];

  byCategory: {
    need: string;
    count: number;
  }[];
}

export const getPwdStats = async () => {
  const response = await api.get("/api/guidance/pwd-stats");

  return response.data as PwdStats;
};