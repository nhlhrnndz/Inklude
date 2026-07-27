import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: PrimaryButtonProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const isInactive = loading || disabled;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.button,
        {
          backgroundColor: isInactive ? colors.disabled : colors.primary,
          borderRadius: radius.xl,
          marginTop: spacing.md,
        },
      ]}
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={loading ? "Loading" : title}
      accessibilityState={{ disabled: isInactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: typography.button.fontFamily,
            fontSize: typography.button.fontSize,
            fontWeight: typography.button.fontWeight,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
});