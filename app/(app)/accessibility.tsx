import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";
import { getMyProfile, saveMyProfile } from "../../utils/api";

const DISABILITY_OPTIONS = [
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Autism",
  "ADHD",
  "Dyslexia",
];

const PREFERENCE_OPTIONS: { key: string; label: string }[] = [
  { key: "liveCaptions", label: "Live Captions" },
  { key: "highContrast", label: "High Contrast" },
  { key: "dyslexiaFont", label: "Dyslexia Font" },
  { key: "simplifiedUI", label: "Simplified UI" },
];

// How long to show the "Preferences Saved" confirmation before redirecting
const SUCCESS_DISPLAY_MS = 1200;

export default function AccessibilityPreferencesScreen() {
  const { colors, typography, spacing, radius } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    liveCaptions: false,
    highContrast: false,
    dyslexiaFont: false,
    simplifiedUI: false,
  });

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const data = await getMyProfile();
      setSelectedTypes(data.disabilityTypes || []);
      setPreferences((prev) => ({ ...prev, ...data.accessibilityPreferences }));
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        console.error("Error loading profile:", err);
      }
      // 404 just means nothing saved yet — that's fine, keep defaults
    } finally {
      setLoading(false);
    }
  };

  const toggleDisabilityType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const togglePreference = (key: string) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (selectedTypes.length === 0) {
      Alert.alert(
        "Missing info",
        "Please select at least one option so we can personalize your experience.",
      );
      return;
    }

    setSaving(true);
    try {
      await saveMyProfile(selectedTypes, preferences);
      setSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        router.replace("/student");
      }, SUCCESS_DISPLAY_MS);
    } catch (err) {
      console.error("Error saving preferences:", err);
      setSaving(false);
      Alert.alert("Error", "Could not save your preferences. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading preferences" />
      </SafeAreaView>
    );
  }

  if (saveSuccess) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background, padding: spacing.lg }]}
        accessibilityLiveRegion="polite"
      >
        <View
          style={[
            styles.successCircle,
            { borderRadius: radius.round, backgroundColor: colors.success, marginBottom: spacing.lg },
          ]}
        >
          <Ionicons name="checkmark" size={36} color="#FFFFFF" />
        </View>
        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            fontWeight: "700",
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          Preferences Saved
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 6,
          }}
        >
          Taking you to your dashboard…
        </Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
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
          Tell us a bit about your support needs and preferences so we can
          personalize your experience.
        </Text>

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginTop: spacing.sm,
            marginBottom: spacing.sm,
          }}
          accessibilityRole="header"
        >
          Support Needs
        </Text>
        <View style={[styles.optionsGrid, { gap: 8 }]}>
          {DISABILITY_OPTIONS.map((type) => {
            const selected = selectedTypes.includes(type);
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  {
                    borderRadius: radius.xl,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : "transparent",
                    marginRight: 8,
                    marginBottom: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                  },
                ]}
                onPress={() => toggleDisabilityType(type)}
                accessibilityRole="button"
                accessibilityLabel={type}
                accessibilityState={{ selected }}
              >
                <Text
                  style={{
                    color: selected ? "#FFFFFF" : colors.text,
                    fontFamily: typography.body.fontFamily,
                    fontWeight: selected ? "600" : "400",
                  }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }}
          accessibilityRole="header"
        >
          Preferences
        </Text>
        {PREFERENCE_OPTIONS.map((pref) => (
          <View
            key={pref.key}
            style={[
              styles.preferenceRow,
              { paddingVertical: 12, borderBottomColor: colors.divider },
            ]}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 15,
                color: colors.text,
              }}
            >
              {pref.label}
            </Text>
            <Switch
              value={preferences[pref.key]}
              onValueChange={() => togglePreference(pref.key)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={colors.primary}
              accessibilityLabel={pref.label}
              accessibilityRole="switch"
            />
          </View>
        ))}

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: saving ? colors.disabled : colors.primary,
              borderRadius: radius.md,
              paddingVertical: 14,
              marginTop: spacing.xl,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saving ? "Saving preferences" : "Save preferences"}
          accessibilityState={{ disabled: saving, busy: saving }}
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
              Save Preferences
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    borderWidth: 1,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  saveButton: {
    alignItems: "center",
  },
  successCircle: {
    width: 72,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
  },
});