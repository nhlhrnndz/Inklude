// constants/sensoryTheme.ts
//
// Calm, low-stimulation look used when "Sensory-friendly mode" is on.
// No bright reds/yellows, softer contrast, and more breathing room.
// ThemeContext swaps these in, so every screen using useTheme() changes
// automatically.

import { ColorPalette } from "../theme/colors";

export const SENSORY_SPACING_SCALE = 1.25;

export const SENSORY_LIGHT: ColorPalette = {
  primary: "#4A6B7C",
  primaryDark: "#3A5563",
  primaryLight: "#6F8F9F",

  background: "#F3F1EC",
  surface: "#FBFAF7",
  secondaryBackground: "#ECE9E2",
  card: "#FBFAF7",

  text: "#2E3436",
  textSecondary: "#5F676B",
  placeholder: "#8A9296",

  border: "#DDD8CE",
  divider: "#E3DFD5",

  success: "#4E7A62",
  warning: "#9C8A66",
  error: "#9A5555",
  danger: "#9A5555",
  disabled: "#C9C5BC",
};

export const SENSORY_DARK: ColorPalette = {
  primary: "#5A8195",
  primaryDark: "#4A6B7C",
  primaryLight: "#7396A8",

  background: "#171A1C",
  surface: "#1F2427",
  secondaryBackground: "#1F2427",
  card: "#252B2E",

  text: "#E6E8E6",
  textSecondary: "#A9B1B3",
  placeholder: "#7B8487",

  border: "#343B3F",
  divider: "#343B3F",

  success: "#4E7A62",
  warning: "#A8946A",
  error: "#B87676",
  danger: "#B87676",
  disabled: "#3A4145",
};

export function scaleSpacing<T extends Record<string, number>>(base: T): T {
  const out: Record<string, number> = {};
  Object.keys(base).forEach((key) => {
    out[key] = Math.round(base[key] * SENSORY_SPACING_SCALE);
  });
  return out as T;
}
