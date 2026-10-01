// constants/supportNeedsPresets.ts
//
// Phase 4 — Support needs → recommended accessibility preferences.
// Needs only RECOMMEND preferences; the student can override every toggle.
// Keep ALLOWED lists in server/models/accessibilityProfileModel.js in sync.

export type SupportNeed =
  | "Deaf"
  | "Hard of Hearing"
  | "Non-Verbal"
  | "Low Vision"
  | "Color Blindness"
  | "Dyslexia"
  | "Physical / Motor"
  | "Autism"
  | "Other";

export interface SupportNeedOption {
  key: SupportNeed;
  label: string;
  description: string; // plain language, not medical terms
}

export const SUPPORT_NEEDS: SupportNeedOption[] = [
  {
    key: "Deaf",
    label: "Deaf",
    description: "I can't hear speech and rely on reading or seeing instead.",
  },
  {
    key: "Hard of Hearing",
    label: "Hard of Hearing",
    description: "I hear some sound but often miss what people say.",
  },
  {
    key: "Non-Verbal",
    label: "Non-Verbal Communication",
    description: "I communicate by typing or tapping instead of speaking.",
  },
  {
    key: "Low Vision",
    label: "Low Vision",
    description: "I have difficulty seeing screens, even with glasses.",
  },
  {
    key: "Color Blindness",
    label: "Color Blindness",
    description: "I have trouble telling some colors apart.",
  },
  {
    key: "Dyslexia",
    label: "Dyslexia / Reading Support",
    description: "Reading text is hard or tiring for me.",
  },
  {
    key: "Physical / Motor",
    label: "Physical / Motor",
    description: "Tapping, holding, or moving my hands is hard for me.",
  },
  {
    key: "Autism",
    label: "Autism / Sensory Support",
    description: "Busy screens, sudden sounds, or changes can overwhelm me.",
  },
  {
    key: "Other",
    label: "Other",
    description: "Something else not listed here.",
  },
];

export type PreferenceKey =
  | "high_contrast"
  | "large_text"
  | "magnification"
  | "dark_mode"
  | "reduced_motion"
  | "reduced_clutter"
  | "live_captions"
  | "text_to_speech"
  | "visual_notifications"
  | "gentle_notifications"
  | "larger_buttons"
  | "keyboard_navigation"
  | "longer_interaction_time";

export const PREFERENCE_GROUPS: {
  title: string;
  items: { key: PreferenceKey; label: string }[];
}[] = [
  {
    title: "Visual",
    items: [
      { key: "high_contrast", label: "High contrast" },
      { key: "large_text", label: "Larger text" },
      { key: "magnification", label: "Magnification" },
      { key: "dark_mode", label: "Dark mode" },
      { key: "reduced_motion", label: "Reduced motion" },
      { key: "reduced_clutter", label: "Reduced visual clutter" },
    ],
  },
  {
    title: "Communication",
    items: [
      { key: "live_captions", label: "Live captions" },
      { key: "text_to_speech", label: "Text-to-speech" },
      { key: "visual_notifications", label: "Visual notifications" },
      { key: "gentle_notifications", label: "Gentle notifications" },
    ],
  },
  {
    title: "Interaction",
    items: [
      { key: "larger_buttons", label: "Larger buttons" },
      { key: "keyboard_navigation", label: "Keyboard navigation" },
      { key: "longer_interaction_time", label: "Longer interaction time" },
    ],
  },
];

export const ALL_PREFERENCE_KEYS: PreferenceKey[] = PREFERENCE_GROUPS.flatMap(
  (g) => g.items.map((i) => i.key),
);

// Mapping table: need → recommended preferences
const NEED_PRESETS: Record<SupportNeed, PreferenceKey[]> = {
  Deaf: ["live_captions", "visual_notifications"],
  "Hard of Hearing": ["live_captions", "visual_notifications"],
  "Non-Verbal": ["text_to_speech"],
  "Low Vision": ["high_contrast", "large_text", "magnification"],
  "Color Blindness": ["high_contrast"],
  Dyslexia: ["large_text", "reduced_clutter"],
  "Physical / Motor": [
    "larger_buttons",
    "keyboard_navigation",
    "longer_interaction_time",
  ],
  Autism: ["reduced_motion", "reduced_clutter", "gentle_notifications"],
  Other: [],
};

// Returns EVERY preference key with true/false, so saving it overwrites
// any older values cleanly.
export function buildRecommendedPreferences(
  needs: string[],
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  ALL_PREFERENCE_KEYS.forEach((k) => {
    result[k] = false;
  });
  needs.forEach((need) => {
    (NEED_PRESETS[need as SupportNeed] || []).forEach((k) => {
      result[k] = true;
    });
  });
  return result;
}

// Human-readable list of what will be switched on, for the preview card.
export function describeRecommended(needs: string[]): string[] {
  const prefs = buildRecommendedPreferences(needs);
  const labels: string[] = [];
  PREFERENCE_GROUPS.forEach((g) =>
    g.items.forEach((i) => {
      if (prefs[i.key]) labels.push(i.label);
    }),
  );
  return labels;
}

// Bridge to the OLD profile system (/api/profile + useFeatures + featureMap)
// so existing screens keep working until they are migrated in Week 2.
const LEGACY_TYPE: Partial<Record<SupportNeed, string>> = {
  Deaf: "Deaf",
  "Hard of Hearing": "Hard of Hearing",
  "Non-Verbal": "Non-Verbal",
  "Low Vision": "Blind / Low Vision",
  Dyslexia: "Dyslexia",
  "Physical / Motor": "Physical / Motor",
  Autism: "Autism",
};

export function toLegacyProfile(
  needs: string[],
  prefs: Record<string, boolean>,
): {
  disabilityTypes: string[];
  accessibilityPreferences: Record<string, boolean>;
} {
  const disabilityTypes = needs
    .map((n) => LEGACY_TYPE[n as SupportNeed])
    .filter((t): t is string => !!t);

  return {
    disabilityTypes,
    accessibilityPreferences: {
      liveCaptions: !!prefs.live_captions,
      highContrast: !!prefs.high_contrast,
      dyslexiaFont: needs.includes("Dyslexia"),
      simplifiedUI: !!prefs.reduced_clutter,
    },
  };
}
