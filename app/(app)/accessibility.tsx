// app/(app)/accessibility.tsx
//
// Phase 4 Week 2 — the ONE Accessibility Preferences screen.
// Visual / Communication / Interaction toggles (recommended from the
// student's support needs, but every toggle can be overridden), plus the
// sensory "Comfort" settings that used to live in Settings.

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import SensorySettingsSection from "../../components/SensorySettingsSection";
import {
  ALL_PREFERENCE_KEYS,
  PREFERENCE_GROUPS,
  buildRecommendedPreferences,
} from "../../constants/supportNeedsPresets";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useTheme } from "../../context/ThemeContext";

const fullPrefs = (p: Record<string, boolean>) => {
  const out: Record<string, boolean> = {};
  ALL_PREFERENCE_KEYS.forEach((k) => {
    out[k] = !!p[k];
  });
  return out;
};

export default function AccessibilityPreferencesScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius, a11y } = useTheme();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();

  const {
    needs,
    preferences,
    isOnboarded,
    loading,
    refresh,
    savePreferences,
    completeOnboarding,
  } = useAccessibility();

  // A student who has not finished onboarding is always in onboarding mode,
  // even if the "onboarding" param was lost (for example after going to
  // "Change my support needs" and coming back).
  const isOnboarding = onboarding === "1" || !isOnboarded;

  const [draft, setDraft] = useState<Record<string, boolean>>(() =>
    fullPrefs(preferences),
  );
  const [saving, setSaving] = useState(false);

  const recommended = useMemo(
    () => buildRecommendedPreferences(needs),
    [needs],
  );

  // Drawer screens are hidden, not unmounted, so reset the form every time
  // the screen regains focus (this avoids stale form state).
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  useFocusEffect(
    useCallback(() => {
      setDraft(fullPrefs(prefsRef.current));
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    setDraft(fullPrefs(preferences));
  }, [preferences]);

  const hasChanges = ALL_PREFERENCE_KEYS.some(
    (k) => !!draft[k] !== !!preferences[k],
  );

  const toggle = (key: string) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetToRecommended = () => {
    setDraft(fullPrefs(recommended));
  };

  const handleBack = () => {
    router.replace("/student");
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Only call the server if something actually changed (during
      // onboarding the student may just want to accept the recommendations).
      if (hasChanges) {
        await savePreferences(draft);
      }

      if (isOnboarding) {
        try {
          await completeOnboarding();
        } catch {
          // Non-fatal: the flag is only used to decide the next login screen.
        }
        router.replace({
          pathname: "/display-name" as any,
          params: { onboarding: "1" },
        });
      } else {
        Toast.show({
          type: "success",
          text1: "Preferences saved",
          text2: "Your settings are now active.",
        });
        router.replace("/student");
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not save",
        text2: err?.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const sectionTitle = (text: string) => (
    <Text
      style={{
        fontFamily: typography.title.fontFamily,
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: spacing.sm,
      }}
      accessibilityRole="header"
    >
      {text}
    </Text>
  );

  if (loading && needs.length === 0 && Object.keys(preferences).length === 0) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const canSave = (isOnboarding || hasChanges) && !saving;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        {!isOnboarding && (
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: spacing.md }]}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Student Dashboard"
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.primary,
                fontWeight: "600",
                marginLeft: spacing.sm,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        )}

        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
            marginBottom: 6,
          }}
          accessibilityRole="header"
        >
          Accessibility Preferences
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
          }}
        >
          {needs.length > 0
            ? "These accessibility preferences were recommended based on your selected support needs. You can change them anytime."
            : "Turn on the settings that help you. You can change them anytime."}
        </Text>

        {PREFERENCE_GROUPS.map((group) => (
          <View key={group.title} style={{ marginBottom: spacing.lg }}>
            {sectionTitle(group.title)}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              {group.items.map((item, i) => {
                const isRecommended = !!recommended[item.key];
                return (
                  <View key={item.key}>
                    {i > 0 && (
                      <View
                        style={{ height: 1, backgroundColor: colors.divider }}
                      />
                    )}
                    <View
                      style={[
                        styles.row,
                        { minHeight: a11y.largerButtons ? 76 : 56 },
                      ]}
                    >
                      <View style={{ flex: 1, paddingRight: spacing.sm }}>
                        <Text
                          style={{
                            fontFamily: typography.body.fontFamily,
                            fontSize: typography.body.fontSize,
                            color: colors.text,
                          }}
                        >
                          {item.label}
                        </Text>
                        {isRecommended && (
                          <Text
                            style={{
                              fontFamily: typography.caption.fontFamily,
                              fontSize: typography.caption.fontSize,
                              fontWeight: "600",
                              color: colors.primary,
                              marginTop: 2,
                            }}
                          >
                            Recommended for you
                          </Text>
                        )}
                      </View>
                      <Switch
                        value={!!draft[item.key]}
                        onValueChange={() => toggle(item.key)}
                        trackColor={{
                          false: colors.disabled,
                          true: colors.primaryLight,
                        }}
                        thumbColor={colors.primary}
                        accessibilityLabel={`${item.label}${
                          isRecommended ? ", recommended for you" : ""
                        }`}
                        accessibilityRole="switch"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {needs.length > 0 && (
          <TouchableOpacity
            onPress={resetToRecommended}
            accessibilityRole="button"
            accessibilityLabel="Reset toggles to the recommended settings"
            style={[styles.linkRow, { marginBottom: spacing.lg }]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "600",
                color: colors.primary,
                marginLeft: 6,
              }}
            >
              Reset to recommended
            </Text>
          </TouchableOpacity>
        )}

        {/* Sensory / comfort settings (merged in from Settings). These save
            themselves immediately, separate from the Save button below. */}
        <SensorySettingsSection />

        {/* Support needs summary (private to the student + Guidance) */}
        {sectionTitle("Your support needs")}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginBottom: spacing.lg,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
            }}
          >
            {needs.length > 0 ? needs.join(", ") : "None selected yet."}
          </Text>
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Only you and the Guidance Office can see this. Teachers and
            classmates cannot.
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/support-needs" as any,
                params: { edit: "1" },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Change my support needs"
            style={[styles.linkRow, { marginTop: spacing.sm }]}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "600",
                color: colors.primary,
                marginLeft: 6,
              }}
            >
              Change my support needs
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: canSave ? colors.primary : colors.disabled,
            borderRadius: radius.md,
            paddingVertical: a11y.largerButtons ? 20 : 14,
            alignItems: "center",
            marginTop: spacing.md,
          }}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel={
            saving
              ? "Saving preferences"
              : isOnboarding
                ? "Save and continue"
                : "Save preferences"
          }
          accessibilityState={{ disabled: !canSave, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: typography.button.fontFamily,
                fontWeight: typography.button.fontWeight,
                fontSize: typography.button.fontSize,
              }}
            >
              {isOnboarding ? "Save & Continue" : "Save Preferences"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { borderWidth: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 44,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
});
