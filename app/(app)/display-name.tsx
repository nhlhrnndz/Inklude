// app/(app)/display-name.tsx
//
// Phase 4 Week 2 — Display Name step (onboarding) and edit screen.
// Blank = classmates see the student's first name.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAccessibility } from "../../context/AccessibilityContext";
import { useTheme } from "../../context/ThemeContext";
import { updateMyUsername } from "../../utils/api";

export default function DisplayNameScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius, a11y } = useTheme();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";

  const { displayUsername, setDisplayUsername } = useAccessibility();

  const [username, setUsername] = useState(displayUsername);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const goNext = () => {
    if (isOnboarding) {
      router.replace({
        pathname: "/basic-info",
        params: { onboarding: "1" },
      });
    } else {
      router.replace("/settings");
    }
  };

  const handleSave = async () => {
    const trimmed = username.trim();

    if (trimmed.length > 0 && trimmed.length < 3) {
      setError("Display name must be at least 3 characters, or left blank.");
      return;
    }

    setError("");

    // Nothing changed: just move on.
    if (trimmed === displayUsername) {
      goNext();
      return;
    }

    try {
      setSaving(true);
      await updateMyUsername(trimmed.length > 0 ? trimmed : null);
      setDisplayUsername(trimmed);

      Toast.show({
        type: "success",
        text1: "Display name saved",
      });

      goNext();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not save your display name. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {!isOnboarding && (
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: spacing.md }]}
            onPress={() => router.replace("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Back to Settings"
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
          Display Name
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
          }}
        >
          Choose how classmates see you. Your teachers and the Guidance Office
          will always see your real name. Your support needs are never shown to
          classmates.
        </Text>

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: 12,
            minHeight: a11y.largerButtons ? 60 : 48,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.text,
          }}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (error) setError("");
          }}
          placeholder="e.g. Drei (leave blank to use your first name)"
          placeholderTextColor={colors.placeholder}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Display name shown to classmates"
        />

        {error ? (
          <Text
            style={{
              color: colors.danger,
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              marginTop: 6,
            }}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={{
            backgroundColor: saving ? colors.disabled : colors.primary,
            borderRadius: radius.md,
            paddingVertical: a11y.largerButtons ? 20 : 14,
            alignItems: "center",
            marginTop: spacing.xl,
          }}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isOnboarding ? "Save and continue" : "Save"}
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
              {isOnboarding ? "Save & Continue" : "Save"}
            </Text>
          )}
        </TouchableOpacity>

        {isOnboarding && (
          <TouchableOpacity
            onPress={goNext}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Skip for now and use my first name"
            style={[styles.skipButton, { marginTop: spacing.md }]}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "600",
                color: colors.primary,
              }}
            >
              Skip for now
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
});
