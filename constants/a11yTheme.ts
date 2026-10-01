// constants/a11yTheme.ts
//
// Phase 4 Week 2 — app-wide accessibility preferences that change how the
// theme looks (high contrast, larger text, reduced motion, bigger buttons).
// ThemeContext reads these; AccessibilityContext writes them.

import { ColorPalette } from "../theme/colors";

export interface A11yPrefs {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  reducedClutter: boolean;
  largerButtons: boolean;
}

export const DEFAULT_A11Y: A11yPrefs = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  reducedClutter: false,
  largerButtons: false,
};

export const LARGE_TEXT_SCALE = 1.25;

export const HIGH_CONTRAST_LIGHT: ColorPalette = {
  primary: "#8D0F16",
  primaryDark: "#5E0A0F",
  primaryLight: "#B5121B",

  background: "#FFFFFF",
  surface: "#FFFFFF",
  secondaryBackground: "#F2F2F2",
  card: "#FFFFFF",

  text: "#000000",
  textSecondary: "#222222",
  placeholder: "#4D4D4D",

  border: "#000000",
  divider: "#595959",

  success: "#006B2D",
  warning: "#8A5A00",
  error: "#B00020",
  danger: "#B00020",
  disabled: "#8C8C8C",
};

export const HIGH_CONTRAST_DARK: ColorPalette = {
  primary: "#E03C46",
  primaryDark: "#B5121B",
  primaryLight: "#FF7A82",

  background: "#000000",
  surface: "#000000",
  secondaryBackground: "#121212",
  card: "#000000",

  text: "#FFFFFF",
  textSecondary: "#E6E6E6",
  placeholder: "#BDBDBD",

  border: "#FFFFFF",
  divider: "#8C8C8C",

  success: "#4ADE80",
  warning: "#FFD54A",
  error: "#FF8A80",
  danger: "#FF8A80",
  disabled: "#6B6B6B",
};

// Scales font sizes and line heights of every typography token.
export function scaleTypography<
  T extends Record<string, { fontSize: number; lineHeight: number }>,
>(base: T, scale: number): T {
  const out: Record<string, any> = {};
  Object.keys(base).forEach((key) => {
    out[key] = {
      ...base[key],
      fontSize: Math.round(base[key].fontSize * scale),
      lineHeight: Math.round(base[key].lineHeight * scale),
    };
  });
  return out as T;
}
