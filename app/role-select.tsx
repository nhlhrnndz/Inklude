import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../context/ThemeContext";

interface RoleOption {
  key: "student" | "teacher" | "guidance";
  initial: string;
  title: string;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    key: "student",
    initial: "S",
    title: "Student",
    description:
      "Access learning tools, AI communication, classroom sessions, and accessibility features.",
  },
  {
    key: "teacher",
    initial: "F",
    title: "Faculty",
    description:
      "Create classroom sessions, manage accessibility support, and communicate with students.",
  },
  {
    key: "guidance",
    initial: "G",
    title: "Guidance",
    description:
      "View student support records, session attendance, and transcript history.",
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { marginBottom: spacing.xxl }]}>
          <Text
            style={{
              fontFamily: typography.h1.fontFamily,
              fontSize: typography.h1.fontSize,
              lineHeight: typography.h1.lineHeight,
              fontWeight: typography.h1.fontWeight,
              color: colors.primary,
            }}
            accessibilityRole="header"
          >
            Continue as
          </Text>

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              lineHeight: typography.body.lineHeight,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: spacing.sm,
            }}
          >
            Choose your role to continue using IncluEd.
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          {ROLE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.85}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/login",
                  params: { role: option.key },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`${option.title}. ${option.description}`}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    borderRadius: radius.round,
                    backgroundColor: colors.primaryLight + "22",
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: typography.title.fontSize,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {option.initial}
                </Text>
              </View>

              <View style={[styles.cardContent, { marginLeft: spacing.md }]}>
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: typography.title.fontSize,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {option.title}
                </Text>

                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    lineHeight: typography.caption.lineHeight,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {option.description}
                </Text>
              </View>

              <Text
                style={[
                  styles.arrow,
                  { color: colors.primary },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },

  header: {
    alignItems: "center",
  },

  card: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  iconCircle: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },

  cardContent: {
    flex: 1,
  },

  arrow: {
    fontSize: 30,
    fontWeight: "300",
  },
});