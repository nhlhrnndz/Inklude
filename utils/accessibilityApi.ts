// utils/accessibilityApi.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    buildRecommendedPreferences,
    toLegacyProfile,
} from "../constants/supportNeedsPresets";
import api, { saveMyProfile } from "./api";

// ---------- Pending selection (chosen BEFORE the account exists) ----------

const PENDING_KEY = "pending_support_needs";

export type SupportNeedsPayload = {
  needs: string[];
  otherText: string;
  consent: boolean;
};

export async function savePendingSupportNeeds(payload: SupportNeedsPayload) {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

export async function getPendingSupportNeeds(): Promise<SupportNeedsPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as SupportNeedsPayload) : null;
  } catch {
    return null;
  }
}

export async function clearPendingSupportNeeds() {
  await AsyncStorage.removeItem(PENDING_KEY);
}

// ---------- API calls ----------

export type MyAccessibility = {
  needs: string[];
  otherText: string | null;
  consentAt: string | null;
  preferences: Record<string, boolean>;
  isOnboarded: boolean;
};

export const getMyAccessibility = async (): Promise<MyAccessibility> => {
  const response = await api.get("/api/accessibility/me");
  return response.data;
};

export const saveSupportNeeds = async (payload: SupportNeedsPayload) => {
  const response = await api.put("/api/accessibility/support-needs", payload);
  return response.data;
};

export const saveAccessibilityPreferences = async (
  preferences: Record<string, boolean>,
) => {
  const response = await api.put("/api/accessibility/preferences", {
    preferences,
  });
  return response.data;
};

export const markOnboarded = async () => {
  const response = await api.patch("/api/accessibility/onboarded");
  return response.data;
};

// ---------- Apply a selection to the logged-in account ----------

export async function applySupportNeeds(payload: SupportNeedsPayload) {
  await saveSupportNeeds(payload);

  const prefs = buildRecommendedPreferences(payload.needs);
  await saveAccessibilityPreferences(prefs);

  // Keep the OLD profile system in sync so current screens
  // (useFeatures, dashboard, live captions) still work.
  const legacy = toLegacyProfile(payload.needs, prefs);
  if (legacy.disabilityTypes.length > 0) {
    try {
      await saveMyProfile(
        legacy.disabilityTypes,
        legacy.accessibilityPreferences,
      );
    } catch (err) {
      console.warn("Legacy profile sync failed:", err);
    }
  }
}

// Called right after login. Returns true if something was applied.
export async function flushPendingSupportNeeds(): Promise<boolean> {
  const pending = await getPendingSupportNeeds();
  if (!pending) return false;
  await applySupportNeeds(pending);
  await clearPendingSupportNeeds();
  return true;
}
