import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../context/ThemeContext";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.xxl }]}>
      {/* Uncomment when BSU logo is added */}

      {/*
      <Image
        source={require("../../assets/images/bsu-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      */}

      <Text
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: 28,
          fontWeight: "700",
          color: colors.primary,
          letterSpacing: 0.5,
        }}
        accessibilityRole="header"
      >
        IncluEd
      </Text>

      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          fontWeight: "600",
          color: colors.text,
          marginTop: 6,
        }}
      >
        Batangas State University
      </Text>

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.textSecondary,
          marginTop: 2,
          marginBottom: spacing.lg,
        }}
      >
        ARASOF–Nasugbu
      </Text>

      <Text
        style={[
          styles.title,
          {
            fontFamily: typography.h1.fontFamily,
            fontSize: typography.h1.fontSize,
            lineHeight: typography.h1.lineHeight,
            fontWeight: typography.h1.fontWeight,
            color: colors.text,
          },
        ]}
        accessibilityRole="header"
      >
        {title}
      </Text>

      <Text
        style={[
          styles.subtitle,
          {
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            lineHeight: typography.body.lineHeight,
            color: colors.textSecondary,
            marginTop: spacing.sm,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },

  logo: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },

  title: {
    textAlign: "center",
  },

  subtitle: {
    textAlign: "center",
  },
});