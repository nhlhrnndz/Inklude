// constants/featureMap.ts
//
// The single source of truth for "which preference unlocks which feature."
// hooks/useFeatures.ts reads this to compute what's active for the logged-in
// student. Nothing here talks to the network — it's pure data + a resolver
// function so it's trivial to unit test.

export type DisabilityType =
  | "Deaf"
  | "Hard of Hearing"
  | "Non-Verbal"
  | "Blind / Low Vision"
  | "Dyslexia"
  | "ADHD"
  | "Physical / Motor"
  | "Autism";

export type FeatureKey =
  // Deaf / Hard of Hearing
  | "live_captions"
  | "transcript_view"
  | "visual_notifications"
  | "peer_caption_sharing"
  // Non-Verbal
  | "tts_quick_phrases"
  | "tts_output"
  | "quick_reply"
  | "auto_speak"
  // Blind / Low Vision
  | "document_reader"
  | "voice_navigation_prompts"
  | "high_contrast"
  | "large_text"
  // Dyslexia
  | "dyslexia_font"
  | "line_focus"
  | "reading_speed_control"
  | "text_highlighting"
  // ADHD
  | "simplified_ui"
  | "focus_timer"
  | "reduced_animations"
  | "distraction_blocker"
  // Physical / Motor
  | "large_touch_targets"
  | "voice_command_navigation"
  | "quick_phrase_grid"
  // Autism
  | "visual_schedule"
  | "routine_builder"
  | "sensory_friendly_colors"
  // Baseline features everyone gets unless a hide rule removes them
  | "tts_mic_input"
  | "visual_captions";

// Features every student has by default. Hide rules below can strip these
// out for specific preference combinations (e.g. a Deaf-only student
// shouldn't see a "speak into the mic" prompt).
const BASELINE_FEATURES: FeatureKey[] = ["tts_mic_input", "visual_captions"];

// Preference -> features it unlocks. A student can have multiple
// disability types selected; the resolver unions all of them.
export const FEATURE_MAP: Record<DisabilityType, FeatureKey[]> = {
  Deaf: [
    "live_captions",
    "transcript_view",
    "visual_notifications",
    "peer_caption_sharing",
  ],
  "Hard of Hearing": [
    "live_captions",
    "transcript_view",
    "visual_notifications",
  ],
  "Non-Verbal": [
    "tts_quick_phrases",
    "tts_output",
    "quick_reply",
    "auto_speak",
  ],
  "Blind / Low Vision": [
    "document_reader",
    "voice_navigation_prompts",
    "high_contrast",
    "large_text",
  ],
  Dyslexia: [
    "dyslexia_font",
    "line_focus",
    "reading_speed_control",
    "text_highlighting",
  ],
  ADHD: [
    "simplified_ui",
    "focus_timer",
    "reduced_animations",
    "distraction_blocker",
  ],
  "Physical / Motor": [
    "large_touch_targets",
    "voice_command_navigation",
    "quick_phrase_grid",
  ],
  Autism: [
    "simplified_ui",
    "visual_schedule",
    "routine_builder",
    "sensory_friendly_colors",
  ],
};

// Suppression rules straight from the Week 0 table's "Features
// Hidden/Disabled" column. Each rule fires when `when(types)` is true and
// removes `hide` from the unlocked set — even if some other selected
// preference would have unlocked it.
type HideRule = {
  when: (types: DisabilityType[]) => boolean;
  hide: FeatureKey[];
  note: string;
};

const HIDE_RULES: HideRule[] = [
  {
    // Deaf hides mic-based TTS input, unless the student is also Non-Verbal
    // (who genuinely needs a way to "speak" through the app).
    when: (types) => types.includes("Deaf") && !types.includes("Non-Verbal"),
    hide: ["tts_mic_input"],
    note: "Deaf without Non-Verbal: hide TTS mic input",
  },
  {
    when: (types) => types.includes("Non-Verbal") && !types.includes("Deaf"),
    hide: ["live_captions"],
    note: "Non-Verbal without Deaf: hide live captions",
  },
  {
    when: (types) =>
      types.includes("Blind / Low Vision") && !types.includes("Deaf"),
    hide: ["visual_captions"],
    note: "Blind/Low Vision without Deaf: hide visual captions",
  },
];

/**
 * Resolve the final list of active features for a student's selected
 * disability types. Unknown strings are ignored rather than throwing, so a
 * stale/malformed profile never crashes a screen — it just shows fewer
 * features than expected.
 */
export function getActiveFeatures(
  disabilityTypes: string[] | null | undefined,
): FeatureKey[] {
  const types = (disabilityTypes || []).filter(
    (t): t is DisabilityType => t in FEATURE_MAP,
  );

  const unlocked = new Set<FeatureKey>(BASELINE_FEATURES);
  types.forEach((t) => FEATURE_MAP[t].forEach((f) => unlocked.add(f)));

  const hidden = new Set<FeatureKey>();
  HIDE_RULES.forEach((rule) => {
    if (rule.when(types)) rule.hide.forEach((f) => hidden.add(f));
  });

  return Array.from(unlocked).filter((f) => !hidden.has(f));
}
