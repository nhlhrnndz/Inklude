// utils/sensoryApi.ts
import api from "./api";

export interface SensorySettingsResponse {
  sensoryMode: boolean;
  whatsNextReminders: boolean;
}

export const getSensorySettings =
  async (): Promise<SensorySettingsResponse> => {
    const response = await api.get("/api/sensory");
    return response.data;
  };

export const updateSensorySettings = async (
  patch: Partial<SensorySettingsResponse>,
): Promise<SensorySettingsResponse> => {
  const response = await api.put("/api/sensory", patch);
  return response.data;
};

// "I need a break" (student)
export const getMyBreak = async (sessionId: number | string) => {
  const response = await api.get(`/api/breaks/${sessionId}/me`);
  return response.data as { onBreak: boolean };
};

export const setMyBreak = async (
  sessionId: number | string,
  onBreak: boolean,
) => {
  const response = await api.post(`/api/breaks/${sessionId}`, { onBreak });
  return response.data as { onBreak: boolean };
};

// Teacher / guidance: who is on a break right now
export const getSessionBreaks = async (
  sessionId: number | string,
): Promise<number[]> => {
  const response = await api.get(`/api/breaks/${sessionId}`);
  return response.data.onBreakUserIds ?? [];
};
