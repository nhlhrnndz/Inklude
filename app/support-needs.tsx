// app/support-needs.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import {
    SUPPORT_NEEDS,
    describeRecommended,
} from "../constants/supportNeedsPresets";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
    applySupportNeeds,
    getMyAccessibility,
    savePendingSupportNeeds,
} from "../utils/accessibilityApi";

export default function SupportNeedsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { user, refreshProfile } = useAuth();
  const { loggedIn, edit } = useLocalSearchParams<{
    loggedIn?: string;
    edit?: string;
  }>();

  // loggedIn=1: a brand-new account with no saved needs lands here after login
  // edit=1: an existing student changes their needs from Accessibility Preferences
  const isLoggedInSetup = loggedIn === "1" && !!user;
  const isEdit = edit === "1" && !!user;
  const hasAccount = isLoggedInSetup || isEdit;

  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(isEdit);

  // In edit mode, start from the student's current needs.
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    getMyAccessibility()
      .then((data) => {
        if (cancelled) return;
        setSelected(data.needs);
        setOtherText(data.otherText ?? "");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingCurrent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  const toggleNeed = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const recommended = describeRecommended(selected);

  const handleContinue = async () => {
    if (selected.length === 0) {
      Toast.show({
        type: "error",
        text1: "Select at least one option",
        text2: "Tell us what support would help you.",
      });
      return;
    }
    if (!consent) {
      Toast.show({
        type: "error",
        text1: "Consent needed",
        text2: "Please tick the consent box to continue.",
      });
      return;
    }

    const payload = {
      needs: selected,
      otherText: selected.includes("Other") ? otherText.trim() : "",
      consent: true,
    };

    try {
      setSaving(true);

      if (hasAccount) {
        await applySupportNeeds(payload);
        await refreshProfile();

        if (isEdit) {
          Toast.show({
            type: "success",
            text1: "Support needs updated",
            text2: "Your recommended settings were refreshed.",
          });
          router.replace("/accessibility" as any);
        } else {
          router.replace({
            pathname: "/accessibility",
            params: { onboarding: "1" },
          });
        }
      } else {
        // No account yet: remember the choice, apply it after first login.
        await savePendingSupportNeeds(payload);
        router.push({ pathname: "/register", params: { role: "student" } });
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not continue",
        text2: err?.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const canContinue = selected.length > 0 && consent && !saving;

  if (loadingCurrent) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {!isLoggedInSetup && (
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: spacing.md }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
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
          }}
          accessibilityRole="header"
        >
          {isEdit ? "Change your support needs" : "What support do you need?"}
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 6,
            marginBottom: spacing.lg,
          }}
        >
          {isEdit
            ? "Saving will reset your accessibility toggles to the settings recommended for your new choices. You can adjust them again afterwards."
            : "Choose all that apply. We use this to recommend settings that fit you. You can change everything later."}
        </Text>

        {SUPPORT_NEEDS.map((option) => {
          const isSelected = selected.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.85}
              onPress={() => toggleNeed(option.key)}
              style={[
                styles.needCard,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected
                    ? colors.primaryLight + "1A"
                    : colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityLabel={`${option.label}. ${option.description}`}
              accessibilityState={{ checked: isSelected }}
            >
              <Ionicons
                name={isSelected ? "checkbox" : "square-outline"}
                size={26}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {option.label}
                </Text>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {selected.includes("Other") && (
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 12,
              marginBottom: spacing.sm,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
            }}
            value={otherText}
            onChangeText={setOtherText}
            placeholder="Tell us a bit more (optional)"
            placeholderTextColor={colors.placeholder}
            maxLength={255}
            multiline
            accessibilityLabel="Describe your other support need"
          />
        )}

        {recommended.length > 0 && (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginTop: spacing.md,
            }}
            accessibilityLiveRegion="polite"
          >
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 6,
              }}
            >
              Recommended for you
            </Text>
            {recommended.map((label) => (
              <Text
                key={label}
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                  marginBottom: 2,
                }}
              >
                ✓ {label}
              </Text>
            ))}
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: spacing.sm,
              }}
            >
              These accessibility preferences were recommended based on your
              selected support needs. You can change them anytime.
            </Text>
          </View>
        )}

        {/* Consent (Data Privacy Act of 2012, RA 10173) */}
        <TouchableOpacity
          style={[styles.consentRow, { marginTop: spacing.lg }]}
          onPress={() => setConsent((c) => !c)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          accessibilityLabel="I consent to IncluEd storing my support needs"
        >
          <Ionicons
            name={consent ? "checkbox" : "square-outline"}
            size={26}
            color={consent ? colors.primary : colors.textSecondary}
          />
          <Text
            style={{
              flex: 1,
              marginLeft: spacing.md,
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              lineHeight: 20,
              color: colors.textSecondary,
            }}
          >
            I understand that my support needs are sensitive personal
            information. I consent to IncluEd storing it to personalize my
            experience. Only I and the Guidance Office can see it. My teachers
            and classmates will not see it.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: canContinue ? colors.primary : colors.disabled,
            borderRadius: radius.md,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: spacing.xl,
          }}
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityLabel={isEdit ? "Save support needs" : "Continue"}
          accessibilityState={{ disabled: !canContinue, busy: saving }}
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
              {isEdit ? "Save" : "Continue"}
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
  needCard: {
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 44,
  },
});
