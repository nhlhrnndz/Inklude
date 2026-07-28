import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "../../context/ThemeContext";

interface AuthFooterProps {
  question: string;
  action: string;
  onPress: () => void;
}

export default function AuthFooter({
  question,
  action,
  onPress,
}: AuthFooterProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { marginTop: spacing.lg }]}>
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: 15,
          color: colors.textSecondary,
        }}
      >
        {question}
      </Text>

      <TouchableOpacity
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`${question} ${action}`}
      >
        <Text
          style={{
            fontFamily: typography.button.fontFamily,
            fontSize: 15,
            fontWeight: "700",
            color: colors.primary,
            marginLeft: 5,
          }}
        >
          {action}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
});