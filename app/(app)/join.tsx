import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";
import { joinSessionByCode } from "../../utils/api";

export default function JoinSessionScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      Alert.alert("Error", "Please enter a session code");
      return;
    }

    setLoading(true);
    try {
      const response = await joinSessionByCode(trimmedCode);
      Alert.alert("Success!", `Joined "${response.session.title}"`, [
        {
          text: "View Session",
          onPress: () => router.push(`/session/${response.session.id}`),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Failed to Join",
        error.response?.data?.message || "Invalid session code",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { padding: spacing.lg }]}>
        <TouchableOpacity
          style={[styles.backButton, { marginBottom: spacing.lg }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: colors.primary,
              fontSize: typography.body.fontSize,
              marginLeft: 6,
            }}
          >
            Back
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
            marginBottom: spacing.sm,
          }}
          accessibilityRole="header"
        >
          Join Session
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.xxl,
          }}
        >
          Enter your teacher's 6-character session code
        </Text>

        <TextInput
          style={[
            styles.codeInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderRadius: radius.md,
              borderColor: colors.primary,
              padding: spacing.lg,
              marginBottom: spacing.lg,
              fontFamily: typography.h1.fontFamily,
            },
          ]}
          placeholder="e.g. A1B2C3"
          placeholderTextColor={colors.placeholder}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          maxLength={6}
          textAlign="center"
          accessibilityLabel="Session code"
          accessibilityHint="Enter the 6-character code from your teacher"
        />

        <TouchableOpacity
          style={[
            styles.joinButton,
            {
              backgroundColor: loading ? colors.disabled : colors.primary,
              borderRadius: radius.md,
              padding: spacing.md,
            },
          ]}
          onPress={handleJoin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={loading ? "Joining session" : "Join session"}
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={{
                fontFamily: typography.button.fontFamily,
                fontSize: typography.button.fontSize,
                fontWeight: typography.button.fontWeight,
                color: "#FFFFFF",
              }}
            >
              Join Session
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  codeInput: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 8,
    borderWidth: 2,
  },
  joinButton: {
    alignItems: "center",
  },
});