// utils/liveApi.ts
import api from "./api";

// Start a live captioning run in an already-created, enabled classroom.
export const goLiveSession = async (sessionId: number) => {
  const response = await api.post(`/api/sessions/${sessionId}/go-live`);
  return response.data;
};

// Stop the current live captioning run — the classroom stays open and
// can be gone live in again later. This is NOT the same as disabling
// the classroom (that's the existing DELETE /api/sessions/:id call).
export const endLiveSession = async (sessionId: number) => {
  const response = await api.post(`/api/sessions/${sessionId}/end-live`);
  return response.data;
};
