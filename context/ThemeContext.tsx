import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";

import {
  A11yPrefs,
  DEFAULT_A11Y,
  HIGH_CONTRAST_DARK,
  HIGH_CONTRAST_LIGHT,
  LARGE_TEXT_SCALE,
  scaleTypography,
} from "../constants/a11yTheme";
import {
  SENSORY_DARK,
  SENSORY_LIGHT,
  scaleSpacing,
} from "../constants/sensoryTheme";
import Colors, { ColorPalette } from "../theme/colors";
import Radius from "../theme/radius";
import Spacing from "../theme/spacing";
import Typography from "../theme/typography";

/**
 * ThemeContext
 *
 * Single source of truth for appearance across the app.
 * Wrap the root layout with <ThemeProvider> once; every screen
 * and component should consume theme values via useTheme(),
 * never by importing theme/colors.ts etc. directly.
 *
 * Phase 2.3 Week 7: "sensory-friendly mode" — muted palette, roomier
 * spacing and a reduceMotion flag, applied globally.
 *
 * Phase 4 Week 2: accessibility preferences (high contrast, larger text,
 * reduced motion, larger buttons) are applied here too, and persisted on
 * the device so they take effect even before the server responds.
 */

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "@inklude/theme-mode";
const SENSORY_STORAGE_KEY = "@inklude/sensory-mode";
const A11Y_STORAGE_KEY = "@inklude/a11y-prefs";

export interface ThemeContextValue {
  /** User's selected preference: light, dark, or system */
  themeMode: ThemeMode;

  /** The actually-applied scheme after resolving "system" */
  resolvedScheme: "light" | "dark";

  /** Convenience boolean */
  isDark: boolean;

  /** Active color palette (high contrast / muted when those modes are on) */
  colors: ColorPalette;

  /** Design tokens (typography grows with large text, spacing grows with
   *  sensory mode or larger buttons) */
  typography: typeof Typography;
  spacing: typeof Spacing;
  radius: typeof Radius;

  /** Update the user's theme preference (persisted) */
  setThemeMode: (mode: ThemeMode) => void;

  /** Convenience toggle between light and dark (exits "system") */
  toggleTheme: () => void;

  /** True while the persisted preference is still loading */
  isThemeLoading: boolean;

  /** Sensory-friendly mode (muted colors, calmer spacing, no motion) */
  sensoryMode: boolean;
  setSensoryMode: (enabled: boolean) => void;

  /** True when animations/motion should be skipped */
  reduceMotion: boolean;

  /** Accessibility preferences that affect how the app looks */
  a11y: A11yPrefs;
  setA11y: (patch: Partial<A11yPrefs>) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveScheme(
  mode: ThemeMode,
  systemScheme: ColorSchemeName,
): "light" | "dark" {
  if (mode === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }

  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [sensoryMode, setSensoryModeState] = useState(false);
  const [a11y, setA11yState] = useState<A11yPrefs>(DEFAULT_A11Y);

  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() ?? "light",
  );

  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Load persisted preferences on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [storedTheme, storedSensory, storedA11y] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(SENSORY_STORAGE_KEY),
          AsyncStorage.getItem(A11Y_STORAGE_KEY),
        ]);

        if (
          isMounted &&
          (storedTheme === "light" ||
            storedTheme === "dark" ||
            storedTheme === "system")
        ) {
          setThemeModeState(storedTheme);
        }

        if (isMounted && storedSensory === "1") {
          setSensoryModeState(true);
        }

        if (isMounted && storedA11y) {
          try {
            const parsed = JSON.parse(storedA11y);
            const next: A11yPrefs = { ...DEFAULT_A11Y };
            (Object.keys(DEFAULT_A11Y) as (keyof A11yPrefs)[]).forEach((k) => {
              if (typeof parsed?.[k] === "boolean") next[k] = parsed[k];
            });
            setA11yState(next);
          } catch {
            // Corrupt value: keep defaults
          }
        }
      } catch {
        // If storage read fails, silently fall back to defaults
      } finally {
        if (isMounted) {
          setIsThemeLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for OS-level appearance changes when "system" mode is selected.
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);

    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {
      // Non-fatal: preference simply won't persist across app restarts.
    });
  }, []);

  const setSensoryMode = useCallback((enabled: boolean) => {
    setSensoryModeState(enabled);

    AsyncStorage.setItem(SENSORY_STORAGE_KEY, enabled ? "1" : "0").catch(
      () => {},
    );
  }, []);

  const setA11y = useCallback((patch: Partial<A11yPrefs>) => {
    setA11yState((prev) => {
      const next = { ...prev, ...patch };
      const changed = (Object.keys(next) as (keyof A11yPrefs)[]).some(
        (k) => next[k] !== prev[k],
      );
      if (!changed) return prev;

      AsyncStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next)).catch(
        () => {},
      );
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const currentResolved = resolveScheme(prev, systemScheme);

      const next: ThemeMode = currentResolved === "dark" ? "light" : "dark";

      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});

      return next;
    });
  }, [systemScheme]);

  const resolvedScheme = resolveScheme(themeMode, systemScheme);

  const isDark = resolvedScheme === "dark";

  const value = useMemo<ThemeContextValue>(() => {
    // High contrast wins over the muted sensory palette (readability first).
    // Sensory mode still adds its spacing and no-motion behavior.
    const colors = a11y.highContrast
      ? isDark
        ? HIGH_CONTRAST_DARK
        : HIGH_CONTRAST_LIGHT
      : sensoryMode
        ? isDark
          ? SENSORY_DARK
          : SENSORY_LIGHT
        : isDark
          ? Colors.dark
          : Colors.light;

    return {
      themeMode,
      resolvedScheme,
      isDark,
      colors,
      typography: a11y.largeText
        ? scaleTypography(Typography, LARGE_TEXT_SCALE)
        : Typography,
      spacing:
        sensoryMode || a11y.largerButtons ? scaleSpacing(Spacing) : Spacing,
      radius: Radius,
      setThemeMode,
      toggleTheme,
      isThemeLoading,
      sensoryMode,
      setSensoryMode,
      reduceMotion: sensoryMode || a11y.reducedMotion,
      a11y,
      setA11y,
    };
  }, [
    themeMode,
    resolvedScheme,
    isDark,
    sensoryMode,
    a11y,
    setThemeMode,
    setSensoryMode,
    setA11y,
    toggleTheme,
    isThemeLoading,
  ]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
