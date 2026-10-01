// components/WhatsActiveBanner.tsx
//
// Phase 4 Week 2 — "What's Active for You" is an ONBOARDING message: it
// introduces the settings that were switched on, then goes away once the
// student has opened it. Preferences stay reachable from Settings.

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { PREFERENCE_GROUPS } from "../constants/supportNeedsPresets";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const MAX_SHOWN = 5;

const LABELS: Record<string, string> = {};
PREFERENCE_GROUPS.forEach((g) =>
  g.items.forEach((i) => {
    LABELS[i.key] = i.label;
  }),
);

export default function WhatsActiveBanner() {
  const router = useRouter();
  const { user } = useAuth();
  const { preferences, loading } = useAccessibility();
  const { colors, typography, spacing, radius, a11y } = useTheme();

  // null = still checking storage; true = already seen; false = show it
  const [seen, setSeen] = useState<boolean | null>(null);
  const storageKey = user?.id ? `@inklude/whats-active-seen:${user.id}` : null;

  useEffect(() => {
    let cancelled = false;
    if (!storageKey) return;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!cancelled) setSeen(value === "1");
      })
      .catch(() => {
        if (!cancelled) setSeen(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const markSeen = () => {
    setSeen(true);
    if (storageKey) AsyncStorage.setItem(storageKey, "1").catch(() => {});
  };

  if (seen !== false || loading) return null;

  const activeLabels = Object.keys(preferences)
    .filter((key) => preferences[key] && LABELS[key])
    .map((key) => LABELS[key]);

  const shown = activeLabels.slice(0, MAX_SHOWN);
  const extra = activeLabels.length - shown.length;

  const reviewPreferences = () => {
    markSeen();
    router.push("/accessibility" as any);
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.primary,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="options-outline" size={20} color={colors.primary} />
        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 16,
            fontWeight: "700",
            color: colors.text,
            marginLeft: spacing.sm,
          }}
          accessibilityRole="header"
        >
          What's active for you
        </Text>
      </View>

      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.text,
          marginTop: spacing.sm,
        }}
      >
        {shown.length > 0
          ? `We turned on: ${shown.join(", ")}${
              extra > 0 ? ` and ${extra} more` : ""
            }.`
          : "No special settings are turned on right now."}
      </Text>

      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.textSecondary,
          marginTop: 4,
        }}
      >
        You can change these anytime in Settings → Accessibility Preferences.
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: spacing.sm,
          gap: spacing.md,
        }}
      >
        <TouchableOpacity
          onPress={reviewPreferences}
          accessibilityRole="button"
          accessibilityLabel="Review my preferences"
          style={{
            minHeight: a11y.largerButtons ? 56 : 44,
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "600",
              color: colors.primary,
            }}
          >
            Review preferences
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={markSeen}
          accessibilityRole="button"
          accessibilityLabel="Got it, dismiss this message"
          style={{
            minHeight: a11y.largerButtons ? 56 : 44,
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "600",
              color: colors.textSecondary,
            }}
          >
            Got it
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
