// app/(app)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius, a11y } = useTheme();

  const SettingsRow = ({
    icon,
    title,
    description,
    onPress,
  }: SettingsRowProps) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      style={[
        styles.row,
        {
          minHeight: a11y.largerButtons ? 84 : 64,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={colors.primary}
        style={{ marginRight: spacing.md }}
      />
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "600",
            color: colors.text,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

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

  const card = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
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
            marginBottom: spacing.lg,
          }}
          accessibilityRole="header"
        >
          Settings
        </Text>

        {sectionTitle("Accessibility")}
        <View style={[styles.card, card]}>
          <SettingsRow
            icon="options-outline"
            title="Accessibility Preferences"
            description="Text size, contrast, captions, motion, buttons and comfort settings."
            onPress={() => router.push("/accessibility" as any)}
          />
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          <SettingsRow
            icon="at-outline"
            title="Display Name"
            description="How classmates see you. Teachers and Guidance see your real name."
            onPress={() => router.push("/display-name" as any)}
          />
        </View>

        {sectionTitle("Account")}
        <View style={[styles.card, card]}>
          <SettingsRow
            icon="person-circle-outline"
            title="My Profile"
            description="Your account and information."
            onPress={() => router.push("/profile" as any)}
          />
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          <SettingsRow
            icon="person-outline"
            title="Edit Profile"
            description="Update your name and email."
            onPress={() => router.push("/edit-profile" as any)}
          />
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          <SettingsRow
            icon="lock-closed-outline"
            title="Change Password"
            description="Choose a new password."
            onPress={() => router.push("/change-password" as any)}
          />
        </View>

        {sectionTitle("Privacy")}
        <View
          style={[
            styles.card,
            card,
            { paddingVertical: spacing.md, marginBottom: 0 },
          ]}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
            }}
          >
            Your support needs are private. Only you and the Guidance Office can
            see them. Teachers only see accommodations you request for their
            class, and classmates only see your display name.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  card: { borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
});
