// app/(app)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SensorySettingsSection from "../../components/SensorySettingsSection";
import {
  ALL_FEATURE_KEYS,
  FEATURE_INFO,
  getWhyText,
} from "../../constants/featureInfo";
import { useTheme } from "../../context/ThemeContext";
import { useFeatures } from "../../hooks/useFeatures";

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { features, hasFeature, disabilityTypes } = useFeatures();

  // Only one "Why?" open at a time keeps the list tidy.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const activeKeys = features;
  const hiddenKeys = ALL_FEATURE_KEYS.filter((k) => !hasFeature(k));

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
        <TouchableOpacity
          style={[styles.backButton, { marginBottom: spacing.md }]}
          onPress={() => router.replace("/student")}
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
          Settings
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
          }}
        >
          {disabilityTypes.length > 0
            ? `Your app is configured for: ${disabilityTypes.join(", ")}.`
            : "You haven't picked any preferences yet."}
        </Text>

        <SensorySettingsSection />

        {/* Add a preference */}
        <TouchableOpacity
          onPress={() => router.push("/accessibility" as any)}
          accessibilityRole="button"
          accessibilityLabel="Add a preference"
          accessibilityHint="Opens Accessibility Preferences"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            paddingVertical: 14,
            marginBottom: spacing.xl,
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: typography.button.fontFamily,
              fontWeight: typography.button.fontWeight,
              fontSize: typography.button.fontSize,
              marginLeft: 8,
            }}
          >
            Add a preference
          </Text>
        </TouchableOpacity>

        {/* Active tools */}
        {sectionTitle(`Your active tools (${activeKeys.length})`)}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.xl,
            },
          ]}
        >
          {activeKeys.map((key, i) => (
            <View key={key}>
              {i > 0 && (
                <View style={{ height: 1, backgroundColor: colors.divider }} />
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingVertical: spacing.md - 2,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                  style={{ marginRight: spacing.sm, marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {FEATURE_INFO[key].label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {FEATURE_INFO[key].description}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Hidden tools */}
        {sectionTitle(`Your hidden tools (${hiddenKeys.length})`)}
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.sm,
          }}
        >
          These tools aren't part of your current setup. Tap "Why?" to see which
          preference controls each one.
        </Text>
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
          {hiddenKeys.length === 0 ? (
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.textSecondary,
                paddingVertical: spacing.md,
              }}
            >
              Nothing is hidden. Every tool is active for you.
            </Text>
          ) : (
            hiddenKeys.map((key, i) => {
              const expanded = expandedKey === key;
              return (
                <View key={key}>
                  {i > 0 && (
                    <View
                      style={{ height: 1, backgroundColor: colors.divider }}
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => setExpandedKey(expanded ? null : key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${FEATURE_INFO[key].label}. Why is this hidden?`}
                    accessibilityState={{ expanded }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      minHeight: 48,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <Ionicons
                      name="eye-off-outline"
                      size={20}
                      color={colors.textSecondary}
                      style={{ marginRight: spacing.sm }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        color: colors.text,
                      }}
                    >
                      {FEATURE_INFO[key].label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        fontWeight: "600",
                        color: colors.primary,
                        marginRight: 4,
                      }}
                    >
                      Why?
                    </Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  {expanded && (
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        color: colors.textSecondary,
                        paddingBottom: spacing.md,
                        paddingLeft: 20 + spacing.sm,
                      }}
                      accessibilityLiveRegion="polite"
                    >
                      {getWhyText(key)}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
});
