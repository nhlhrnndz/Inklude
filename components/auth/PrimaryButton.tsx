import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import Colors from "../../theme/colors";
import Radius from "../../theme/radius";
import Spacing from "../../theme/spacing";
import Typography from "../../theme/typography";

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
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.button,
        (loading || disabled) && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: Radius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },

  buttonDisabled: {
    backgroundColor: Colors.disabled,
  },

  text: {
    color: "#FFFFFF",
    fontSize: Typography.button,
    fontWeight: "700",
  },
});