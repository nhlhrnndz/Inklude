/**
 * Centralized color tokens for the Inklude application.
 *
 * All screens and components MUST source colors from this file
 * (via the ThemeProvider / useTheme hook) — never hardcode hex
 * values directly inside a screen or component.
 *
 * Structure supports Light Mode, Dark Mode, and System Default
 * (System Default resolves to one of the two palettes below at
 * the ThemeProvider level).
 */

export interface ColorPalette {
  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Surfaces
  background: string;
  surface: string;
  secondaryBackground: string;
  card: string;

  // Text
  text: string;
  textSecondary: string;
  placeholder: string;

  // Structure
  border: string;
  divider: string;

  // Status
  success: string;
  warning: string;
  error: string;
  danger: string;
  disabled: string;
}

const light: ColorPalette = {
  // Brand
  primary: "#B5121B",
  primaryDark: "#8D0F16",
  primaryLight: "#D63A44",

  // Surfaces
  background: "#F8F8F8",
  surface: "#FFFFFF",
  secondaryBackground: "#F8F8F8",
  card: "#FFFFFF",

  // Text
  text: "#1A1A1A",
  textSecondary: "#6B7280",
  placeholder: "#9CA3AF",

  // Structure
  border: "#ECECEC",
  divider: "#ECECEC",

  // Status
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  danger: "#DC2626",
  disabled: "#D1D5DB",
};

const dark: ColorPalette = {
  // Brand
  primary: "#D63A44",
  primaryDark: "#B5121B",
  primaryLight: "#E5636B",

  // Surfaces
  background: "#0F1115",
  surface: "#1A1D24",
  secondaryBackground: "#1A1D24",
  card: "#20242D",

  // Text
  text: "#F5F5F5",
  textSecondary: "#B5BBC7",
  placeholder: "#7C8394",

  // Structure
  border: "#303440",
  divider: "#303440",

  // Status
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  danger: "#F87171",
  disabled: "#3A3F4B",
};

const Colors = {
  light,
  dark,
};

export default Colors;