// context/AccessibilityContext.tsx
//
// Phase 4 Week 2 — holds the logged-in student's support needs,
// accessibility preferences and display name. Loads from the server (with a
// local cache), applies the visual preferences to the theme, and mirrors
// changes into the old profile system so older screens keep working.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

import { DEFAULT_A11Y } from "../constants/a11yTheme";
import { toLegacyProfile } from "../constants/supportNeedsPresets";
import {
    getMyAccessibility,
    markOnboarded,
    saveAccessibilityPreferences,
} from "../utils/accessibilityApi";
import { getMyProfile, saveMyProfile } from "../utils/api";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";

type Prefs = Record<string, boolean>;

type AccessibilityContextType = {
  needs: string[];
  preferences: Prefs;
  isOnboarded: boolean;
  displayUsername: string;
  loading: boolean;
  refresh: () => Promise<void>;
  savePreferences: (prefs: Prefs) => Promise<void>;
  setDisplayUsername: (value: string) => void;
  completeOnboarding: () => Promise<void>;
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null,
);

const cacheKey = (userId: number) => `@inklude/a11y-cache:${userId}`;

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, updateProfileData } = useAuth();
  const { setA11y, setThemeMode, themeMode } = useTheme();

  // Ref so refresh() stays stable even when the theme mode changes.
  const themeModeRef = useRef(themeMode);
  themeModeRef.current = themeMode;

  const [needs, setNeeds] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Prefs>({});
  const [isOnboarded, setIsOnboarded] = useState(true);
  const [displayUsername, setDisplayUsername] = useState("");
  const [loading, setLoading] = useState(true);

  const userId = user?.id;
  const role = user?.role;

  const applyToTheme = useCallback(
    (prefs: Prefs) => {
      setA11y({
        highContrast: !!prefs.high_contrast,
        largeText: !!prefs.large_text,
        reducedMotion: !!prefs.reduced_motion,
        reducedClutter: !!prefs.reduced_clutter,
        largerButtons: !!prefs.larger_buttons,
      });
    },
    [setA11y],
  );

  const refresh = useCallback(async () => {
    if (!userId || role !== "student") {
      // Teachers/guidance never inherit a previous student's look.
      setA11y(DEFAULT_A11Y);
      setLoading(false);
      return;
    }

    const [accResult, profileResult] = await Promise.allSettled([
      getMyAccessibility(),
      getMyProfile(),
    ]);

    if (accResult.status === "fulfilled") {
      const data = accResult.value;
      setNeeds(data.needs);
      setPreferences(data.preferences);
      setIsOnboarded(data.isOnboarded);
      applyToTheme(data.preferences);

      if (data.preferences.dark_mode && themeModeRef.current !== "dark") {
        setThemeMode("dark");
      }

      AsyncStorage.setItem(
        cacheKey(userId),
        JSON.stringify({
          needs: data.needs,
          preferences: data.preferences,
          isOnboarded: data.isOnboarded,
        }),
      ).catch(() => {});
    }

    if (profileResult.status === "fulfilled") {
      setDisplayUsername((profileResult.value as any)?.displayUsername || "");
    }

    setLoading(false);
  }, [userId, role, applyToTheme, setA11y, setThemeMode]);

  // Show the cached copy instantly, then refresh from the server.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (userId && role === "student") {
        try {
          const raw = await AsyncStorage.getItem(cacheKey(userId));
          if (raw && !cancelled) {
            const cached = JSON.parse(raw);
            setNeeds(cached.needs || []);
            setPreferences(cached.preferences || {});
            setIsOnboarded(cached.isOnboarded !== false);
            setLoading(false);
          }
        } catch {
          // Ignore a bad cache
        }
      }
      if (!cancelled) await refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, role, refresh]);

  const savePreferences = useCallback(
    async (newPrefs: Prefs) => {
      const previous = preferences;

      const result = await saveAccessibilityPreferences(newPrefs);
      const saved: Prefs = result.preferences ?? newPrefs;

      setPreferences(saved);
      applyToTheme(saved);

      if (userId) {
        AsyncStorage.setItem(
          cacheKey(userId),
          JSON.stringify({ needs, preferences: saved, isOnboarded }),
        ).catch(() => {});
      }

      // Dark mode is a theme mode, not a palette flag.
      if (!!saved.dark_mode !== !!previous.dark_mode) {
        setThemeMode(saved.dark_mode ? "dark" : "light");
      }

      // Keep the old profile system in sync so older screens still work.
      const legacy = toLegacyProfile(needs, saved);
      if (legacy.disabilityTypes.length > 0) {
        try {
          await saveMyProfile(
            legacy.disabilityTypes,
            legacy.accessibilityPreferences,
          );
          await updateProfileData(legacy);
        } catch (err) {
          console.warn("Legacy profile sync failed:", err);
        }
      }
    },
    [
      preferences,
      needs,
      isOnboarded,
      userId,
      applyToTheme,
      setThemeMode,
      updateProfileData,
    ],
  );

  const completeOnboarding = useCallback(async () => {
    await markOnboarded();
    setIsOnboarded(true);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        needs,
        preferences,
        isOnboarded,
        displayUsername,
        loading,
        refresh,
        savePreferences,
        setDisplayUsername,
        completeOnboarding,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider",
    );
  }
  return context;
}
