import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";

interface PasswordInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function PasswordInput({
  label,
  error,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: PasswordInputProps) {
  const [hidden, setHidden] = useState(true);
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
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={error ? colors.error : colors.primary}
          style={{ marginRight: spacing.sm }}
        />

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
            },
          ]}
          secureTextEntry={hidden}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? accessibilityHint}
          {...props}
        />

        <TouchableOpacity
          onPress={() => setHidden(!hidden)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={hidden ? "Show password" : "Hide password"}
          accessibilityState={{ expanded: !hidden }}
        >
          <Ionicons
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
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