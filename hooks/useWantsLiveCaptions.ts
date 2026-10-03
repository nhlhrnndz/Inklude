// hooks/useWantsLiveCaptions.ts
//
// Single source of truth for "does this student use live captions?"
// A student does if they are Deaf / Hard of Hearing, OR they turned on the
// "live captions" toggle in Accessibility Preferences.
//
// - studentWantsLiveCaptions(): the plain rule. Use it on screens that are
//   NOT inside AccessibilityProvider (for example app/session/[id]).
// - useWantsLiveCaptions(): hook version for screens inside the (app) drawer
//   (dashboard, sidebar, layout).

import { useAccessibility } from "../context/AccessibilityContext";

export function studentWantsLiveCaptions(
  needs: string[] | null | undefined,
  preferences: Record<string, boolean> | null | undefined,
): boolean {
  const list = needs || [];
  const needsHearing =
    list.includes("Deaf") || list.includes("Hard of Hearing");
  return needsHearing || !!preferences?.live_captions;
}

export function useWantsLiveCaptions(): boolean {
  const { needs, preferences } = useAccessibility();
  return studentWantsLiveCaptions(needs, preferences);
}
