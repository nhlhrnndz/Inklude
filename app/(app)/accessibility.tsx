//accessibility.tsx

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getMyProfile, saveMyProfile, updateMyUsername } from "../../utils/api";

const DISABILITY_OPTIONS = [
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Autism",
  "ADHD",
  "Dyslexia",
  "Blind / Low Vision",
  "Physical / Motor",
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
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { updateProfileData } = useAuth();

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

  // Phase 2.3 Week 1.3 — peer-facing display username. Separate from
  // disabilityTypes/preferences: saved via its own endpoint since it's
  // an account identity choice, not an accessibility setting.
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const data = await getMyProfile();

      setSelectedTypes(data.disabilityTypes || []);

      setPreferences((prev) => ({
        ...prev,
        ...data.accessibilityPreferences,
      }));

      const existingUsername = data.displayUsername || "";
      setUsername(existingUsername);
      setOriginalUsername(existingUsername);
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
    setSelectedTypes((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.includes(type)
        ? safePrev.filter((t) => t !== type)
        : [...safePrev, type];
    });
  };

  const togglePreference = (key: string) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleBack = () => {
    router.replace("/student");
  };

  const handleSave = async () => {
    console.log("DEBUG selectedTypes at save time:", selectedTypes); // ← add this
    if (selectedTypes.length === 0) {
      Alert.alert(
        "Missing info",
        "Please select at least one option so we can personalize your experience.",
      );
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length > 0 && trimmedUsername.length < 3) {
      setUsernameError(
        "Username must be at least 3 characters, or left blank.",
      );
      return;
    }

    setUsernameError("");
    setSaving(true);

    try {
      await saveMyProfile(selectedTypes, preferences);

      // Only hit the username endpoint if it actually changed — avoids
      // an unnecessary request (and a possible validation error) on
      // every save when the student didn't touch this field.
      if (trimmedUsername !== originalUsername) {
        await updateMyUsername(
          trimmedUsername.length > 0 ? trimmedUsername : null,
        );
        setOriginalUsername(trimmedUsername);
      }

      // Update the in-memory/cached profile immediately so useFeatures()
      // reflects the new preferences right away — no re-login needed,
      // and no extra network round-trip to re-fetch what we already have.
      await updateProfileData({
        disabilityTypes: selectedTypes,
        accessibilityPreferences: preferences,
      });

      setSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        if (onboarding === "1") {
          router.replace({
            pathname: "/basic-info",
            params: { onboarding: "1" },
          });
        } else {
          router.replace("/student");
        }
      }, SUCCESS_DISPLAY_MS);
    } catch (err: any) {
      console.error("Error saving preferences:", err);
      console.error("SERVER SAID:", JSON.stringify(err?.response?.data));
      console.error("FAILED URL:", err?.config?.url);

      setSaving(false);

      const serverMessage = err?.response?.data?.message;
      Alert.alert(
        "Error",
        serverMessage || "Could not save your preferences. Please try again.",
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.centered,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          accessibilityLabel="Loading preferences"
        />
      </SafeAreaView>
    );
  }

  if (saveSuccess) {
    return (
      <SafeAreaView
        style={[
          styles.centered,
          {
            backgroundColor: colors.background,
            padding: spacing.lg,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <View
          style={[
            styles.successCircle,
            {
              borderRadius: radius.round,
              backgroundColor: colors.success,
              marginBottom: spacing.lg,
            },
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
          {onboarding === "1"
            ? "Taking you to a few more details…"
            : "Taking you to your dashboard…"}
        </Text>

        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginTop: 16 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              marginBottom: spacing.md,
            },
          ]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Student Dashboard"
          accessibilityHint="Returns to the Student Dashboard"
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

        {/* Header */}
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

        {/* Support Needs */}
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

        {/* Preferences */}
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
              {
                paddingVertical: 12,
                borderBottomColor: colors.divider,
              },
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
              trackColor={{
                false: colors.disabled,
                true: colors.primaryLight,
              }}
              thumbColor={colors.primary}
              accessibilityLabel={pref.label}
              accessibilityRole="switch"
            />
          </View>
        ))}

        {/* Display Username — Phase 2.3 Week 1.3 */}
        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginTop: spacing.lg,
            marginBottom: spacing.sm,
          }}
          accessibilityRole="header"
        >
          Display Name for Classmates
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.sm,
          }}
        >
          Choose how classmates see you in the session roster. Your teacher and
          the guidance office will always see your real name.
        </Text>

        <TextInput
          style={[
            styles.usernameInput,
            {
              backgroundColor: colors.surface,
              borderColor: usernameError ? colors.danger : colors.border,
              borderRadius: radius.md,
              padding: 12,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
            },
          ]}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (usernameError) setUsernameError("");
          }}
          placeholder="e.g. StarGazer22 (leave blank to use your first name)"
          placeholderTextColor={colors.placeholder}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Display name shown to classmates"
        />

        {usernameError ? (
          <Text
            style={{
              color: colors.danger,
              fontSize: typography.caption.fontSize,
              marginTop: 4,
            }}
          >
            {usernameError}
          </Text>
        ) : null}

        {/* Save */}
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
          accessibilityLabel={
            saving ? "Saving preferences" : "Save preferences"
          }
          accessibilityState={{
            disabled: saving,
            busy: saving,
          }}
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
              {onboarding === "1" ? "Save & Continue" : "Save Preferences"}
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
  usernameInput: {
    borderWidth: 1,
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
});
