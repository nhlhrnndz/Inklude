import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

/**
 * Sidebar
 *
 * Presentational drawer content shared across Student, Teacher, and
 * Guidance Counselor roles. This component does NOT perform navigation
 * itself — it reports a logical route key via onNavigate, so the
 * actual Drawer navigator (Phase 7) can resolve real Expo Router paths
 * without this component needing to know them.
 *
 * Exception: Logout. Logging out needs to clear the navigation stack
 * (not just swap the current screen), so any screens visited during
 * the ended session — e.g. /tts, /session/[id] — can't resurface via
 * the back button after the next login. That's handled directly here
 * via router.dismissTo("/") rather than being routed through
 * onNavigate, since it's a cross-cutting concern rather than a normal
 * dashboard nav item.
 */

export type UserRole = "student" | "teacher" | "guidance";

interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  student: [
    { key: "dashboard", label: "Dashboard", icon: "home-outline" },
    { key: "mySessions", label: "My Sessions", icon: "albums-outline" },
    { key: "joinSession", label: "Join Session", icon: "enter-outline" },
    { key: "guidance", label: "Guidance", icon: "heart-outline" },
    { key: "profile", label: "Profile", icon: "person-outline" },
    { key: "settings", label: "Settings", icon: "settings-outline" },
    {
      key: "accessibility",
      label: "Accessibility Preferences",
      icon: "options-outline",
    },
  ],
  teacher: [
    { key: "dashboard", label: "Dashboard", icon: "home-outline" },
    { key: "createSession", label: "Create Session", icon: "add-circle-outline" },
    { key: "mySessions", label: "My Sessions", icon: "albums-outline" },
    { key: "students", label: "Students", icon: "people-outline" },
    { key: "profile", label: "Profile", icon: "person-outline" },
    { key: "settings", label: "Settings", icon: "settings-outline" },
  ],
  guidance: [
    { key: "dashboard", label: "Dashboard", icon: "home-outline" },
    { key: "students", label: "Students", icon: "people-outline" },
    { key: "sessions", label: "Sessions", icon: "albums-outline" },
    { key: "reports", label: "Reports", icon: "document-text-outline" },
    { key: "profile", label: "Profile", icon: "person-outline" },
    { key: "settings", label: "Settings", icon: "settings-outline" },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  guidance: "Guidance Counselor",
};

function isKnownRole(role: string | undefined): role is UserRole {
  return role === "student" || role === "teacher" || role === "guidance";
}

interface SidebarProps {
  /** Logical key of the currently active nav item (e.g. "dashboard") */
  activeRoute: string;
  /** Called with a logical route key when the user taps a nav item */
  onNavigate: (routeKey: string) => void;
  /** Called when the user taps "Help" */
  onHelp?: () => void;
  /** Whether the user is currently online (defaults to true) */
  isOnline?: boolean;
}

export default function Sidebar({
  activeRoute,
  onNavigate,
  onHelp,
  isOnline = true,
}: SidebarProps) {
  const { colors, typography, spacing, radius, isDark, toggleTheme } =
    useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  const role: UserRole = isKnownRole(user?.role) ? user.role : "student";
  const navItems = NAV_ITEMS[role];
  const displayName = user?.name ?? "Guest User";
  const initial = displayName.charAt(0).toUpperCase();

  // Clears the auth state AND resets the native navigation stack back
  // to the root. Without the dismiss, any screens visited this
  // session (e.g. /tts) stay parked in history and can reappear via
  // the back button after the next login, regardless of role.
  const handleLogout = async () => {
    await logout();
    router.dismissTo("/");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={["top", "bottom", "left"]}
    >
      {/* Top Section */}
      <View
        style={[
          styles.topSection,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
            borderBottomColor: colors.divider,
          },
        ]}
      >
        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              {
                borderRadius: radius.round,
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary,
              },
            ]}
            accessibilityLabel={`${displayName}'s profile picture`}
          >
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                color: "#FFFFFF",
              }}
            >
              {initial}
            </Text>
          </View>

          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isOnline ? colors.success : colors.disabled,
                borderColor: colors.surface,
              },
            ]}
            accessibilityLabel={isOnline ? "Online" : "Offline"}
          />
        </View>

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            lineHeight: typography.title.lineHeight,
            color: colors.text,
            marginTop: spacing.sm,
          }}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {displayName}
        </Text>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            lineHeight: typography.caption.lineHeight,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {ROLE_LABEL[role]} · {isOnline ? "Online" : "Offline"}
        </Text>
      </View>

      {/* Middle Navigation */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={{
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
      >
        {navItems.map((item) => {
          const isActive = item.key === activeRoute;

          return (
            <Pressable
              key={item.key}
              onPress={() => onNavigate(item.key)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.navItem,
                {
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm + 4,
                  paddingHorizontal: spacing.md,
                  marginBottom: spacing.xs,
                  backgroundColor: isActive
                    ? colors.primaryLight + "22"
                    : pressed
                    ? colors.secondaryBackground
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? colors.primary : colors.textSecondary}
                style={{ marginRight: spacing.sm }}
              />
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontWeight: isActive ? "600" : "400",
                  fontSize: typography.body.fontSize,
                  color: isActive ? colors.primary : colors.text,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom Section */}
      <View
        style={[
          styles.bottomSection,
          {
            borderTopColor: colors.divider,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
          },
        ]}
      >
        <View
          style={[
            styles.themeRow,
            {
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          <View style={styles.themeRowLabel}>
            <Ionicons
              name={isDark ? "moon-outline" : "sunny-outline"}
              size={22}
              color={colors.textSecondary}
              style={{ marginRight: spacing.sm }}
            />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
              }}
            >
              Dark Mode
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.disabled, true: colors.primaryLight }}
            thumbColor={colors.primary}
            accessibilityLabel="Toggle dark mode"
            accessibilityRole="switch"
          />
        </View>

        <Pressable
          onPress={onHelp}
          accessibilityRole="button"
          accessibilityLabel="Help"
          hitSlop={8}
          style={({ pressed }) => [
            styles.navItem,
            {
              borderRadius: radius.md,
              paddingVertical: spacing.sm + 4,
              paddingHorizontal: spacing.sm,
              backgroundColor: pressed
                ? colors.secondaryBackground
                : "transparent",
            },
          ]}
        >
          <Ionicons
            name="help-circle-outline"
            size={22}
            color={colors.textSecondary}
            style={{ marginRight: spacing.sm }}
          />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
            }}
          >
            Help
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          hitSlop={8}
          style={({ pressed }) => [
            styles.navItem,
            {
              borderRadius: radius.md,
              paddingVertical: spacing.sm + 4,
              paddingHorizontal: spacing.sm,
              backgroundColor: pressed
                ? colors.secondaryBackground
                : "transparent",
            },
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={colors.danger}
            style={{ marginRight: spacing.sm }}
          />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.danger,
            }}
          >
            Logout
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-start",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderWidth: 2,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  navScroll: {
    flex: 1,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  bottomSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  themeRowLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
});