import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Colors from "../../theme/colors";
import Spacing from "../../theme/spacing";

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
  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        {question}
      </Text>

      <TouchableOpacity onPress={onPress}>
        <Text style={styles.action}>
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
    marginTop: Spacing.lg,
    flexWrap: "wrap",
  },

  question: {
    color: Colors.textSecondary,
    fontSize: 15,
  },

  action: {
    marginLeft: 5,
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
});