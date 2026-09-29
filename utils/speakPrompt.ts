// utils/speakPrompt.ts
//
// Speaks a short prompt only when the student has the
// voice_navigation_prompts feature. Failures are swallowed: a prompt is a
// nice-to-have and should never crash a screen.

import * as Speech from "expo-speech";

export function speakPrompt(enabled: boolean, text: string) {
  if (!enabled) return;
  try {
    Speech.speak(text);
  } catch (err) {
    console.warn("voice navigation prompt failed:", err);
  }
}
