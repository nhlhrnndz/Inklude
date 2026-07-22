import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Colors from "../../theme/colors";
import Spacing from "../../theme/spacing";
import Typography from "../../theme/typography";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export default function AuthHeader({
  title,
  subtitle,
}: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Uncomment when BSU logo is added */}

      {/*
      <Image
        source={require("../../assets/images/bsu-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      */}

      <Text style={styles.brand}>
        IncluEd
      </Text>

      <Text style={styles.university}>
        Batangas State University
      </Text>

      <Text style={styles.campus}>
        ARASOF–Nasugbu
      </Text>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },

  logo: {
    width: 90,
    height: 90,
    marginBottom: Spacing.md,
  },

  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  university: {
    marginTop: 6,
    fontSize: 15,
    color: Colors.text,
    fontWeight: "600",
  },

  campus: {
    marginTop: 2,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  title: {
    fontSize: Typography.h1,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },

  subtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
});