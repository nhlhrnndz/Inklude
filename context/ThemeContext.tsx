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
 */

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "@inklude/theme-mode";

export interface ThemeContextValue {
  /** User's selected preference: light, dark, or system */
  themeMode: ThemeMode;
  /** The actually-applied scheme after resolving "system" */
  resolvedScheme: "light" | "dark";
  /** Convenience boolean */
  isDark: boolean;
  /** Active color palette for resolvedScheme */
  colors: ColorPalette;
  /** Static design tokens (do not change with theme) */
  typography: typeof Typography;
  spacing: typeof Spacing;
  radius: typeof Radius;
  /** Update the user's theme preference (persisted) */
  setThemeMode: (mode: ThemeMode) => void;
  /** Convenience toggle between light and dark (exits "system") */
  toggleTheme: () => void;
  /** True while the persisted preference is still loading */
  isThemeLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveScheme(
  mode: ThemeMode,
  systemScheme: ColorSchemeName
): "light" | "dark" {
  if (mode === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Load persisted preference on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          isMounted &&
          (stored === "light" || stored === "dark" || stored === "system")
        ) {
          setThemeModeState(stored);
        }
      } catch {
        // If storage read fails, silently fall back to "system"
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

  // Listen for OS-level appearance changes (for "system" mode)
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
      // Non-fatal: preference simply won't persist across app restarts
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

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      resolvedScheme,
      isDark,
      colors: isDark ? Colors.dark : Colors.light,
      typography: Typography,
      spacing: Spacing,
      radius: Radius,
      setThemeMode,
      toggleTheme,
      isThemeLoading,
    }),
    [themeMode, resolvedScheme, isDark, setThemeMode, toggleTheme, isThemeLoading]
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