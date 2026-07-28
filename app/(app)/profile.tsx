import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  guidance: "Guidance Counselor",
};

function showComingSoon(feature: string) {
  Toast.show({
    type: "info",
    text1: "Coming Soon",
    text2: `${feature} will be available in a future update.`,
  });
}

interface ProfileRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function ProfileRow({ icon, label, onPress, destructive }: ProfileRowProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { paddingVertical: spacing.md - 2 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? colors.danger : colors.textSecondary}
        style={{ marginRight: spacing.sm + 2 }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          color: destructive ? colors.danger : colors.text,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const displayName = user?.name ?? "Guest User";
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = user?.role ? ROLE_LABEL[user.role] ?? user.role : "—";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
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
          Profile
        </Text>

        {/* Profile Picture */}
        <View style={[styles.avatarSection, { marginBottom: spacing.xl }]}>
          <View
            style={[
              styles.avatar,
              { borderRadius: radius.round, backgroundColor: colors.primaryLight },
            ]}
            accessibilityLabel={`${displayName}'s profile picture`}
          >
            <Text
              style={{
                fontFamily: typography.h1.fontFamily,
                fontSize: 36,
                color: "#FFFFFF",
                fontWeight: "700",
              }}
            >
              {initial}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.changePhotoBtn, { marginTop: spacing.sm }]}
            onPress={() => showComingSoon("Changing your profile picture")}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            <Ionicons name="camera-outline" size={16} color={colors.primary} />
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.primary,
                fontWeight: "600",
                marginLeft: 6,
              }}
            >
              Change Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
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
          Basic Information
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <View style={[styles.infoRow, { paddingVertical: spacing.sm }]}>
            <Text style={{ fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.textSecondary }}>
              Name
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.text, marginTop: 2 }}>
              {displayName}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={[styles.infoRow, { paddingVertical: spacing.sm }]}>
            <Text style={{ fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.textSecondary }}>
              Email
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.text, marginTop: 2 }}>
              {user?.email ?? "—"}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={[styles.infoRow, { paddingVertical: spacing.sm }]}>
            <Text style={{ fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.textSecondary }}>
              Role
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.text, marginTop: 2 }}>
              {roleLabel}
            </Text>
          </View>
        </View>

        {/* Edit Profile */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.lg,
            },
          ]}
        >
          <ProfileRow
            icon="create-outline"
            label="Edit Profile"
            onPress={() => showComingSoon("Editing your profile")}
          />
        </View>

        {/* Security */}
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
          Security
        </Text>
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
          <ProfileRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => showComingSoon("Changing your password")}
          />
        </View>

        {/* Notifications */}
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
          Notifications
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
          <ProfileRow
            icon="notifications-outline"
            label="Notification Settings"
            onPress={() => showComingSoon("Notification settings")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  avatarSection: {
    alignItems: "center",
  },
  avatar: {
    width: 96,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    borderWidth: 1,
  },
  infoRow: {
    // dynamic values applied inline
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});