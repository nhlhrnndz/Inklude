/**
 * Centralized typography tokens for the Inklude application.
 *
 * Typeface: Atkinson Hyperlegible (chosen for maximum legibility
 * and accessibility). Font files are loaded once at the root via
 * expo-font / useFonts using the family names declared below.
 *
 * All screens and components MUST source type styles from this
 * file (via the ThemeProvider / useTheme hook) — never hardcode
 * font sizes, weights, or families directly inside a screen.
 */

export const FontFamily = {
  regular: "AtkinsonHyperlegible-Regular",
  bold: "AtkinsonHyperlegible-Bold",
  italic: "AtkinsonHyperlegible-Italic",
  boldItalic: "AtkinsonHyperlegible-BoldItalic",
} as const;

export interface TextStyleToken {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  fontWeight:
    | "400"
    | "500"
    | "600"
    | "700";
}

const Typography = {
  h1: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },

  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },

  title: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: FontFamily.bold,
    fontWeight: "600",
  },

  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.regular,
    fontWeight: "400",
  },

  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FontFamily.regular,
    fontWeight: "400",
  },

  small: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: FontFamily.regular,
    fontWeight: "400",
  },

  button: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: FontFamily.bold,
    fontWeight: "600",
  },
} as const satisfies Record<string, TextStyleToken>;

export default Typography;