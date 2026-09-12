//change-password.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import PasswordInput from "../../components/auth/PasswordInput";
import PrimaryButton from "../../components/auth/PrimaryButton";

import { useTheme } from "../../context/ThemeContext";

import { changePassword as changePasswordRequest } from "../../utils/api";
import { passwordsMatch, validatePassword } from "../../utils/validators/auth";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmNewPasswordError, setConfirmNewPasswordError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    setCurrentPasswordError("");
    setNewPasswordError("");
    setConfirmNewPasswordError("");

    let isValid = true;

    if (!currentPassword) {
      setCurrentPasswordError("Please enter your current password.");
      isValid = false;
    }

    if (!newPassword) {
      setNewPasswordError("Please create a new password.");
      isValid = false;
    } else if (!validatePassword(newPassword)) {
      setNewPasswordError("Password must be at least 8 characters.");
      isValid = false;
    }

    if (!confirmNewPassword) {
      setConfirmNewPasswordError("Please confirm your new password.");
      isValid = false;
    } else if (!passwordsMatch(newPassword, confirmNewPassword)) {
      setConfirmNewPasswordError("Passwords do not match.");
      isValid = false;
    }

    if (!isValid) {
      Toast.show({
        type: "error",
        text1: "Check Your Information",
        text2: "Please correct the highlighted fields.",
      });
      return;
    }

    try {
      setLoading(true);

      await changePasswordRequest(currentPassword, newPassword);

      Toast.show({
        type: "success",
        text1: "Password Changed",
        text2: "Your password has been updated.",
      });

      router.back();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "We couldn't change your password. Please try again.";

      Toast.show({
        type: "error",
        text1: "Change Password Failed",
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.header,
            { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: typography.h2.fontFamily,
              fontSize: typography.h2.fontSize,
              lineHeight: typography.h2.lineHeight,
              fontWeight: typography.h2.fontWeight,
              color: colors.text,
              marginLeft: spacing.md,
            }}
            accessibilityRole="header"
          >
            Change Password
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <PasswordInput
            label="Current Password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (currentPasswordError) setCurrentPasswordError("");
            }}
            returnKeyType="next"
            error={currentPasswordError}
          />

          <PasswordInput
            label="New Password"
            placeholder="Create a new password"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (newPasswordError) setNewPasswordError("");
              if (confirmNewPasswordError) setConfirmNewPasswordError("");
            }}
            returnKeyType="next"
            error={newPasswordError}
          />

          <PasswordInput
            label="Confirm New Password"
            placeholder="Re-enter your new password"
            value={confirmNewPassword}
            onChangeText={(text) => {
              setConfirmNewPassword(text);
              if (confirmNewPasswordError) setConfirmNewPasswordError("");
            }}
            returnKeyType="done"
            onSubmitEditing={handleChangePassword}
            error={confirmNewPasswordError}
          />

          <PrimaryButton
            title="Change Password"
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
});
