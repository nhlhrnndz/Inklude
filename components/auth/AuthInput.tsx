import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function AuthInput({
  label,
  error,
  icon,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: AuthInputProps) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }]}>
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          fontWeight: "600",
          color: colors.text,
          marginBottom: spacing.sm,
        }}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          {
            height: 56,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? colors.error : colors.primary}
            style={{ marginRight: spacing.sm }}
          />
        )}

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
            },
          ]}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? accessibilityHint}
          {...props}
        />
      </View>

      {error ? (
        <Text
          style={{
            marginTop: 6,
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.error,
          }}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // dynamic values applied inline
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
  },
});