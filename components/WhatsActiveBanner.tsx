// components/WhatsActiveBanner.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

import { BASELINE_KEYS, FEATURE_INFO } from "../constants/featureInfo";
import { useTheme } from "../context/ThemeContext";
import { useFeatures } from "../hooks/useFeatures";

const MAX_TOOLS_SHOWN = 4;

export default function WhatsActiveBanner() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { features, disabilityTypes } = useFeatures();

  const goToPreferences = () => router.push("/accessibility" as any);

  const hasPreferences = disabilityTypes.length > 0;

  const activeTools = features
    .filter((f) => !BASELINE_KEYS.includes(f))
    .map((f) => FEATURE_INFO[f].label);

  const shownTools = activeTools.slice(0, MAX_TOOLS_SHOWN);
  const extraCount = activeTools.length - shownTools.length;

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
      accessible={false}
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

      {hasPreferences ? (
        <>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.text,
              marginTop: spacing.sm,
            }}
          >
            Your app is configured for: {disabilityTypes.join(", ")}.
          </Text>
          {shownTools.length > 0 && (
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Active tools: {shownTools.join(", ")}
              {extraCount > 0 ? ` and ${extraCount} more` : ""}.
            </Text>
          )}
        </>
      ) : (
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: spacing.sm,
          }}
        >
          You haven't picked any preferences yet. Choose what fits you and the
          app will adapt.
        </Text>
      )}

      <TouchableOpacity
        onPress={goToPreferences}
        accessibilityRole="button"
        accessibilityLabel={
          hasPreferences ? "Change preferences" : "Set your preferences"
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          minHeight: 44,
          marginTop: spacing.xs ?? 4,
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
          {hasPreferences ? "Change preferences" : "Set preferences"}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.primary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    </View>
  );
}
