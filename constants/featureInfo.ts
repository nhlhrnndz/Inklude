// constants/featureInfo.ts
//
// Display-side companion to featureMap.ts: friendly names, short
// descriptions, and the "Why?" explanation used by the banner and the
// Settings screen. The "unlocked by" list is computed from FEATURE_MAP,
// so it can never drift out of sync with the real rules.

import { DisabilityType, FEATURE_MAP, FeatureKey } from "./featureMap";

export const FEATURE_INFO: Record<
  FeatureKey,
  { label: string; description: string }
> = {
  // Deaf / Hard of Hearing
  live_captions: {
    label: "Live Captions",
    description: "See what the teacher says as text in real time.",
  },
  transcript_view: {
    label: "Transcript View",
    description: "Scroll back through everything that was said in class.",
  },
  visual_notifications: {
    label: "Visual Notifications",
    description: "Alerts are shown on screen instead of relying on sound.",
  },
  peer_caption_sharing: {
    label: "Peer Caption Sharing",
    description: "Share a caption snippet with a classmate.",
  },

  // Non-Verbal
  tts_quick_phrases: {
    label: "TTS Quick Phrases",
    description: "One-tap phrases like Yes, No and Thank You, spoken aloud.",
  },
  tts_output: {
    label: "Text-to-Speech",
    description: "Type a message and have your phone speak it.",
  },
  quick_reply: {
    label: "Quick Reply",
    description: "Answer quickly using ready-made replies.",
  },
  auto_speak: {
    label: "Auto-Speak",
    description: "Messages you send are spoken automatically.",
  },

  // Blind / Low Vision
  document_reader: {
    label: "Document Reader",
    description: "Have handouts and documents read aloud to you.",
  },
  voice_navigation_prompts: {
    label: "Voice Navigation Prompts",
    description: "Spoken feedback for important actions in the app.",
  },
  high_contrast: {
    label: "High Contrast",
    description: "Stronger colors that are easier to see.",
  },
  large_text: {
    label: "Large Text",
    description: "Bigger text across the app.",
  },

  // Dyslexia
  dyslexia_font: {
    label: "Dyslexia-Friendly Font",
    description: "A font designed to be easier to read.",
  },
  line_focus: {
    label: "Line Focus",
    description: "Highlights one line at a time while reading.",
  },
  reading_speed_control: {
    label: "Reading Speed Control",
    description: "Adjust how fast text is read or revealed.",
  },
  text_highlighting: {
    label: "Text Highlighting",
    description: "Highlights the text you are currently on.",
  },

  // ADHD
  simplified_ui: {
    label: "Simplified Interface",
    description: "Fewer elements on screen so it is easier to focus.",
  },
  focus_timer: {
    label: "Focus Timer",
    description: "Work in short, timed focus blocks.",
  },
  reduced_animations: {
    label: "Reduced Animations",
    description: "Less movement on screen.",
  },
  distraction_blocker: {
    label: "Distraction Blocker",
    description: "Hides non-essential items while you focus.",
  },

  // Physical / Motor
  large_touch_targets: {
    label: "Large Touch Targets",
    description: "Bigger buttons with more space between them.",
  },
  voice_command_navigation: {
    label: "Voice Command Navigation",
    description: "Move around the app by speaking.",
  },
  quick_phrase_grid: {
    label: "Quick Phrase Grid",
    description: "A big-button grid of common phrases.",
  },

  // Autism
  visual_schedule: {
    label: "Visual Schedule",
    description: "See your day as clear, predictable cards.",
  },
  routine_builder: {
    label: "Routine Builder",
    description: "Build and follow your own routines.",
  },
  sensory_friendly_colors: {
    label: "Sensory-Friendly Colors",
    description: "Calmer, muted colors.",
  },

  // Baseline
  tts_mic_input: {
    label: "Mic Input for Speech",
    description: "Speak into the mic instead of typing.",
  },
  visual_captions: {
    label: "Visual Captions",
    description: "Captions shown on the session screen.",
  },
};

export const ALL_FEATURE_KEYS = Object.keys(FEATURE_INFO) as FeatureKey[];

// Mirrors BASELINE_FEATURES in featureMap.ts (not exported there).
// Used to keep "everyone gets this" items out of the banner summary.
export const BASELINE_KEYS: FeatureKey[] = ["tts_mic_input", "visual_captions"];

// Which selected preferences unlock this feature (empty for baseline ones).
export function getUnlockedBy(key: FeatureKey): DisabilityType[] {
  return (Object.keys(FEATURE_MAP) as DisabilityType[]).filter((type) =>
    FEATURE_MAP[type].includes(key),
  );
}

const BASELINE_WHY: Partial<Record<FeatureKey, string>> = {
  tts_mic_input:
    "Everyone gets this by default, but it is hidden for Deaf students (unless they are also Non-Verbal) because it relies on speaking into the mic.",
  visual_captions:
    "Everyone gets this by default, but it is hidden for Blind / Low Vision students (unless they are also Deaf) because they use audio tools instead.",
};

// Text shown when a student taps "Why?" on a hidden tool.
export function getWhyText(key: FeatureKey): string {
  const unlockedBy = getUnlockedBy(key);
  if (unlockedBy.length === 0) {
    return BASELINE_WHY[key] ?? "This tool is not part of your current setup.";
  }
  return `Turned on by: ${unlockedBy.join(", ")}. Add ${
    unlockedBy.length > 1 ? "one of these" : "this"
  } in Accessibility Preferences to unlock it.`;
}
