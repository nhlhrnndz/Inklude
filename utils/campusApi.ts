// utils/campusApi.ts
// Accessibility Map + Campus Events API.
// Same convention as utils/api.ts: baseURL has no "/api", so every path
// here starts with "/api/...".
import { Platform } from "react-native";

import api from "./api";

export type PickedPhoto = { uri: string; mimeType?: string | null };

// A supporting document picked in the browser (web only).
export type PickedDocument = {
  file: any; // the browser File object
  name: string;
  type: string;
  size: number;
};

export type MapType =
  | "pwd_restroom"
  | "ramp"
  | "elevator"
  | "accessible_entrance"
  | "accessible_seating"
  | "other";

export type MapLocation = {
  id: number;
  building: string;
  type: MapType;
  floor: string;
  note: string;
  xPct: number;
  yPct: number;
  photos: { id: number; url: string }[];
};

export type EventTag =
  | "wheelchair_accessible"
  | "captions"
  | "quiet_area"
  | "accessible_restroom"
  | "accessible_seating"
  | "audio_announcements";

export type CampusEvent = {
  id: number;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  status: "active" | "cancelled";
  tags: EventTag[];
  inCalendar: boolean;
  createdAt: string;
  // Only sent to Guidance. null = no document on file.
  document?: { name: string; type: string; size: number } | null;
};

export const EVENT_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
export const EVENT_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

// Turns "/uploads/map/x.jpg" into a full URL on the same server as the API.
export function assetUrl(path: string) {
  const base = String(api.defaults.baseURL || "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
  return `${base}${path}`;
}

async function appendPhotos(form: FormData, photos: PickedPhoto[]) {
  for (let i = 0; i < photos.length; i++) {
    const ph = photos[i];
    const mime = ph.mimeType || "image/jpeg";
    const ext = mime.includes("png")
      ? "png"
      : mime.includes("webp")
        ? "webp"
        : "jpg";
    const name = `map-${Date.now()}-${i}.${ext}`;

    if (Platform.OS === "web") {
      const blob = await (await fetch(ph.uri)).blob();
      form.append("photos", blob, name);
    } else {
      form.append("photos", { uri: ph.uri, name, type: mime } as any);
    }
  }
}

// Same approach as transcribeAudioChunk in api.ts: let the platform set the
// multipart boundary itself instead of forcing a header.
const MULTIPART = { headers: { "Content-Type": undefined as any } };

// ---------- map ----------

export async function getMapLocations(): Promise<MapLocation[]> {
  const res = await api.get("/api/map");
  return res.data.locations ?? [];
}

export async function createMapLocation(input: {
  building: string;
  type: MapType;
  floor?: string;
  note?: string;
  xPct: number;
  yPct: number;
  photos: PickedPhoto[];
}): Promise<MapLocation> {
  const form = new FormData();
  form.append("building", input.building);
  form.append("type", input.type);
  form.append("floor", input.floor ?? "");
  form.append("note", input.note ?? "");
  form.append("xPct", String(input.xPct));
  form.append("yPct", String(input.yPct));
  await appendPhotos(form, input.photos);

  const res = await api.post("/api/map", form, MULTIPART);
  return res.data.location;
}

export async function addMapPhotos(id: number, photos: PickedPhoto[]) {
  const form = new FormData();
  await appendPhotos(form, photos);
  const res = await api.post(`/api/map/${id}/photos`, form, MULTIPART);
  return res.data.location as MapLocation;
}

export async function deleteMapPhoto(photoId: number) {
  await api.delete(`/api/map/photos/${photoId}`);
}

export async function deleteMapLocation(id: number) {
  await api.delete(`/api/map/${id}`);
}

// ---------- events ----------

export async function getEvents(): Promise<CampusEvent[]> {
  const res = await api.get("/api/events");
  return res.data.events ?? [];
}

// Web only: opens the browser's file chooser for the supporting document.
// Resolves null when nothing is chosen, rejects with a readable message when
// the file type or size is not allowed.
export function pickEventDocument(): Promise<PickedDocument | null> {
  return new Promise((resolve, reject) => {
    const doc = (globalThis as any).document;

    if (Platform.OS !== "web" || !doc) {
      reject(
        new Error("Attaching a document is available in the web version."),
      );
      return;
    }

    const input = doc.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

    input.onchange = () => {
      const file = input.files && input.files[0];

      if (!file) {
        resolve(null);
        return;
      }
      if (!EVENT_DOCUMENT_TYPES.includes(file.type)) {
        reject(new Error("Only PDF, JPG or PNG files are allowed."));
        return;
      }
      if (file.size > EVENT_DOCUMENT_MAX_BYTES) {
        reject(new Error("The document is too large (max 5 MB)."));
        return;
      }

      resolve({ file, name: file.name, type: file.type, size: file.size });
    };

    input.oncancel = () => resolve(null);

    input.click();
  });
}

export async function createEvent(input: {
  title: string;
  description?: string;
  location: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  tags: EventTag[];
  document?: PickedDocument | null;
}): Promise<{ event: CampusEvent; recipientCount: number }> {
  const form = new FormData();
  form.append("title", input.title);
  form.append("description", input.description ?? "");
  form.append("location", input.location);
  form.append("date", input.date);
  form.append("startTime", input.startTime);
  form.append("endTime", input.endTime);
  form.append("tags", JSON.stringify(input.tags));

  if (input.document) {
    form.append("document", input.document.file, input.document.name);
  }

  const res = await api.post("/api/events", form, MULTIPART);
  return res.data;
}

// Guidance only. The file needs the login token, so it is fetched through the
// API and opened from memory instead of a plain link.
export async function openEventDocument(id: number) {
  const g = globalThis as any;

  if (Platform.OS !== "web" || !g.window) {
    throw new Error("Open supporting documents in the web version.");
  }

  // Open the tab first (browsers block popups that open after an await)
  const tab = g.window.open("", "_blank");

  try {
    const res = await api.get(`/api/events/${id}/document`, {
      responseType: "blob",
    });
    const url = g.URL.createObjectURL(res.data);

    if (tab) {
      tab.location.href = url;
    } else {
      const a = g.document.createElement("a");
      a.href = url;
      a.target = "_blank";
      g.document.body.appendChild(a);
      a.click();
      a.remove();
    }

    setTimeout(() => g.URL.revokeObjectURL(url), 5 * 60 * 1000);
  } catch (err) {
    if (tab) tab.close();
    throw err;
  }
}

export async function cancelEvent(id: number) {
  await api.patch(`/api/events/${id}/cancel`);
}

export async function addEventToCalendar(id: number) {
  await api.post(`/api/events/${id}/calendar`);
}

export async function removeEventFromCalendar(id: number) {
  await api.delete(`/api/events/${id}/calendar`);
}
