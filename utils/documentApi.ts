// utils/documentApi.ts
import { Platform } from "react-native";
import api from "./api";

export interface DocumentMeta {
  id: number;
  filename: string;
  mimeType: string;
  sessionId: number;
  sessionTitle: string | null;
  teacherName: string | null;
  createdAt: string;
  textLength: number | null;
}

export interface DocumentDetail extends DocumentMeta {
  text: string;
}

export const getMyDocuments = async (): Promise<{
  documents: DocumentMeta[];
}> => {
  const response = await api.get("/api/documents/mine");
  return response.data;
};

export const getSessionDocuments = async (
  sessionId: number,
): Promise<{ documents: DocumentMeta[] }> => {
  const response = await api.get(`/api/documents/session/${sessionId}`);
  return response.data;
};

export const getDocument = async (
  id: number | string,
): Promise<{ document: DocumentDetail }> => {
  const response = await api.get(`/api/documents/${id}`);
  return response.data;
};

export const deleteDocument = async (id: number) => {
  const response = await api.delete(`/api/documents/${id}`);
  return response.data;
};

export const uploadDocument = async (
  sessionId: number,
  file: {
    uri: string;
    name: string;
    mimeType?: string | null;
    webFile?: File | null;
  },
) => {
  const formData = new FormData();
  formData.append("sessionId", String(sessionId));

  if (Platform.OS === "web") {
    const blob = file.webFile ?? (await (await fetch(file.uri)).blob());
    formData.append("file", blob, file.name);
  } else {
    // @ts-ignore — React Native's FormData accepts this shape
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    });
  }

  // Text extraction (especially OCR on images) can take a while.
  const response = await api.post("/api/documents", formData, {
    headers: { "Content-Type": undefined },
    timeout: 120000,
  });
  return response.data;
};
