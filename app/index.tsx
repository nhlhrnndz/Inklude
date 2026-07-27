import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../context/ThemeContext";

export default function StartScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.content, { paddingHorizontal: spacing.lg }]}>
        {/* Replace this with your IncluEd logo later */}
        <View
          style={[
            styles.logoPlaceholder,
            {
              borderRadius: radius.round,
              borderColor: colors.primary,
              marginBottom: spacing.xl,
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
            IncluEd
          </Text>
        </View>

        <Text
          style={{
            fontFamily: typography.h1.fontFamily,
            fontSize: typography.h1.fontSize,
            lineHeight: typography.h1.lineHeight,
            fontWeight: typography.h1.fontWeight,
            color: colors.primary,
            textAlign: "center",
          }}
          accessibilityRole="header"
        >
          Welcome to IncluEd
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            lineHeight: typography.body.lineHeight,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: spacing.md,
            paddingHorizontal: spacing.sm,
          }}
        >
          An Inclusive Education Support System that empowers accessible
          learning and communication for every BatStateU student.
        </Text>
      </View>

      <View style={[styles.bottomContainer, { paddingHorizontal: spacing.lg }]}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              borderRadius: radius.xl,
              paddingVertical: spacing.md + 2,
            },
          ]}
          activeOpacity={0.85}
          onPress={() => router.push("/role-select")}
          accessibilityRole="button"
          accessibilityLabel="Get started"
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: typography.button.fontFamily,
              fontSize: typography.button.fontSize,
              fontWeight: typography.button.fontWeight,
            }}
          >
            Get Started
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: spacing.lg,
          }}
        >
          Batangas State University • ARASOF–Nasugbu
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 40,
  },

  content: {
    alignItems: "center",
    marginTop: 40,
  },

  logoPlaceholder: {
    width: 120,
    height: 120,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomContainer: {
    alignItems: "center",
  },

  button: {
    width: "100%",
    alignItems: "center",
    elevation: 4,
  },
});