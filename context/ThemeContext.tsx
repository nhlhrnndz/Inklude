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
 * Phase 2.3 Week 7: also carries "sensory-friendly mode" — a muted
 * palette, roomier spacing and a reduceMotion flag, applied globally.
 */

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "@inklude/theme-mode";
const SENSORY_STORAGE_KEY = "@inklude/sensory-mode";

export interface ThemeContextValue {
  /** User's selected preference: light, dark, or system */
  themeMode: ThemeMode;

  /** The actually-applied scheme after resolving "system" */
  resolvedScheme: "light" | "dark";

  /** Convenience boolean */
  isDark: boolean;

  /** Active color palette for resolvedScheme (muted when sensory mode is on) */
  colors: ColorPalette;

  /** Design tokens (spacing grows slightly in sensory mode) */
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

  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() ?? "light",
  );

  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Load persisted preferences on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [storedTheme, storedSensory] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(SENSORY_STORAGE_KEY),
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

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      resolvedScheme,
      isDark,
      colors: sensoryMode
        ? isDark
          ? SENSORY_DARK
          : SENSORY_LIGHT
        : isDark
          ? Colors.dark
          : Colors.light,
      typography: Typography,
      spacing: sensoryMode ? scaleSpacing(Spacing) : Spacing,
      radius: Radius,
      setThemeMode,
      toggleTheme,
      isThemeLoading,
      sensoryMode,
      setSensoryMode,
      reduceMotion: sensoryMode,
    }),
    [
      themeMode,
      resolvedScheme,
      isDark,
      sensoryMode,
      setThemeMode,
      setSensoryMode,
      toggleTheme,
      isThemeLoading,
    ],
  );

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
