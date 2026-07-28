import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

import AuthFooter from "../components/auth/AuthFooter";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import PasswordInput from "../components/auth/PasswordInput";
import PrimaryButton from "../components/auth/PrimaryButton";
import ScreenContainer from "../components/common/ScreenContainer";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import { getMyProfile } from "../utils/api";
import { validateEmail, validatePassword } from "../utils/validators/auth";

const ROLE_LABEL: Record<string, string> = {
  teacher: "Faculty",
  guidance: "Guidance",
  student: "Student",
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();
  const { role } = useLocalSearchParams<{ role: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(false);

  const roleLabel = ROLE_LABEL[role as string] ?? "Student";
  const isGuidance = role === "guidance";

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");

    let valid = true;

    if (!email.trim()) {
      setEmailError("Please enter your university email.");
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Please enter your password.");
      valid = false;
    } else if (!validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    }

    if (!valid) return;

    try {
      setLoading(true);

      const loggedInUser = await login(email.trim(), password);

      Toast.show({
        type: "success",
        text1: "Welcome Back!",
        text2: "Signing you in...",
      });

      if (loggedInUser.role === "teacher") {
        router.replace("/teacher");
        return;
      }

      if (loggedInUser.role === "guidance") {
        router.replace("/guidance-dashboard");
        return;
      }

      try {
        await getMyProfile();
        router.replace("/student");
      } catch (profileErr: any) {
        if (profileErr?.response?.status === 404) {
          router.replace("/accessibility");
        } else {
          router.replace("/student");
        }
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: err.response?.data?.message ?? "Incorrect email or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <AuthHeader
        title="Welcome Back"
        subtitle="Sign in to continue using IncluEd"
      />

      <View
        style={[
          styles.roleBadge,
          {
            paddingHorizontal: 18,
            paddingVertical: 8,
            marginBottom: spacing.xl,
            backgroundColor: colors.primaryLight + "1A",
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.primary,
          },
        ]}
        accessibilityLabel={`Signing in as ${roleLabel}`}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: colors.primary,
          }}
        >
          {roleLabel}
        </Text>
      </View>

      <AuthInput
        label="University Email"
        icon="mail-outline"
        placeholder="Enter your university email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (emailError) setEmailError("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        error={emailError}
      />

      <PasswordInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (passwordError) setPasswordError("");
        }}
        returnKeyType="done"
        onSubmitEditing={handleLogin}
        error={passwordError}
      />

      <TouchableOpacity
        style={[styles.forgotContainer, { marginBottom: spacing.lg }]}
        onPress={() =>
          Toast.show({
            type: "info",
            text1: "Coming Soon",
            text2: "Forgot Password will be available in a future update.",
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Forgot password"
        hitSlop={8}
      >
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            fontWeight: "600",
            color: colors.primary,
          }}
        >
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <PrimaryButton
        title={loading ? "Signing In..." : "Sign In"}
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
      />

      {/* Guidance accounts are provisioned by an administrator —
          no self-service registration path for that role. */}
      {!isGuidance && (
        <AuthFooter
          question="Don't have an account?"
          action="Create Account"
          onPress={() =>
            router.push({
              pathname: "/register",
              params: { role },
            })
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  roleBadge: {
    alignSelf: "center",
  },

  forgotContainer: {
    alignItems: "flex-end",
  },
});