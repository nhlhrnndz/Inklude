import React from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import Colors from "../../theme/colors";
import Radius from "../../theme/radius";
import Spacing from "../../theme/spacing";
import Typography from "../../theme/typography";

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function AuthInput({
  label,
  error,
  icon,
  ...props
}: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          error && styles.inputError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={Colors.primary}
            style={styles.icon}
          />
        )}

        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.placeholder}
          {...props}
        />
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },

  label: {
    fontSize: Typography.body,
    color: Colors.text,
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },

  input: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.body,
  },

  icon: {
    marginRight: Spacing.sm,
  },

  inputError: {
    borderColor: Colors.error,
  },

  error: {
    marginTop: 6,
    color: Colors.error,
    fontSize: Typography.caption,
  },
});