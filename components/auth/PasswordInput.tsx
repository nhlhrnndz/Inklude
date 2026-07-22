import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "../../theme/colors";
import Radius from "../../theme/radius";
import Spacing from "../../theme/spacing";
import Typography from "../../theme/typography";

interface PasswordInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function PasswordInput({
  label,
  error,
  ...props
}: PasswordInputProps) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          error && styles.inputError,
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={Colors.primary}
          style={styles.icon}
        />

        <TextInput
          style={styles.input}
          secureTextEntry={hidden}
          placeholderTextColor={Colors.placeholder}
          {...props}
        />

        <TouchableOpacity
          onPress={() => setHidden(!hidden)}
          hitSlop={10}
        >
          <Ionicons
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={Colors.primary}
          />
        </TouchableOpacity>
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
    marginBottom: Spacing.sm,
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.text,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },

  inputError: {
    borderColor: Colors.error,
  },

  icon: {
    marginRight: Spacing.sm,
  },

  input: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.body,
  },

  error: {
    marginTop: 6,
    color: Colors.error,
    fontSize: Typography.caption,
  },
});