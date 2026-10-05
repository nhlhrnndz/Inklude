// app/register.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import Toast from "react-native-toast-message";

import AuthFooter from "../components/auth/AuthFooter";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import PasswordInput from "../components/auth/PasswordInput";
import PrimaryButton from "../components/auth/PrimaryButton";
import ScreenContainer from "../components/common/ScreenContainer";

import { useAuth } from "../context/AuthContext";
import {
  passwordsMatch,
  validateEmail,
  validateName,
  validatePassword,
} from "../utils/validators/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const { role: roleParam } = useLocalSearchParams<{
    role?: string | string[];
  }>();

  const normalizedRole = Array.isArray(roleParam) ? roleParam[0] : roleParam;

  const role: "student" | "teacher" | "guidance" =
    normalizedRole === "teacher" || normalizedRole === "guidance"
      ? normalizedRole
      : "student";

  // Faculty and Guidance accounts need an invite code (the server uses it
  // to decide the real role). Students leave it empty.
  const needsInviteCode = role === "teacher" || role === "guidance";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [inviteCodeError, setInviteCodeError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setInviteCodeError("");

    let isValid = true;

    if (!name.trim()) {
      setNameError("Please enter your full name.");
      isValid = false;
    } else if (!validateName(name)) {
      setNameError("Please enter a valid full name.");
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError("Please enter your university email.");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Please create a password.");
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters.");
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password.");
      isValid = false;
    } else if (!passwordsMatch(password, confirmPassword)) {
      setConfirmPasswordError("Passwords do not match.");
      isValid = false;
    }

    if (needsInviteCode && !inviteCode.trim()) {
      setInviteCodeError("Please enter the invite code you were given.");
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

      // Step 9 fix: no "role" argument anymore. The inviteCode (if any)
      // goes in position 4, and the server decides the actual role.
      const result = await register(
        name.trim(),
        email.trim(),
        password,
        needsInviteCode ? inviteCode.trim() : undefined,
      );

      const assignedRole = result?.role ?? "student";
      const roleLabel =
        assignedRole === "teacher"
          ? "Teacher"
          : assignedRole === "guidance"
            ? "Guidance"
            : "Student";

      Toast.show({
        type: "success",
        text1: "Account Created!",
        text2: `You are registered as ${roleLabel}.`,
      });

      setTimeout(() => {
        router.replace({
          pathname: "/login",
          params: { role: assignedRole },
        });
      }, 1200);
    } catch (err: any) {
      console.error("Registration Error:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "We couldn't create your account. Please try again.";

      if (err?.response?.status === 403 && needsInviteCode) {
        setInviteCodeError(message);
      }

      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <AuthHeader
        title="Create Account"
        subtitle="Create your account to get started with IncluEd"
      />

      <AuthInput
        label="Full Name"
        icon="person-outline"
        placeholder="Enter your full name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (nameError) setNameError("");
        }}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        error={nameError}
      />

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
        placeholder="Create a password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (passwordError) setPasswordError("");
          if (confirmPasswordError) setConfirmPasswordError("");
        }}
        returnKeyType="next"
        error={passwordError}
      />

      <PasswordInput
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          if (confirmPasswordError) setConfirmPasswordError("");
        }}
        returnKeyType={needsInviteCode ? "next" : "done"}
        onSubmitEditing={needsInviteCode ? undefined : handleRegister}
        error={confirmPasswordError}
      />

      {needsInviteCode && (
        <AuthInput
          label="Invite Code"
          icon="key-outline"
          placeholder={
            role === "guidance"
              ? "Enter the full code, e.g. GUIDANCE-2026-XXXXXXXX"
              : "Enter the full code, e.g. FACULTY-2026-XXXXXXXX"
          }
          value={inviteCode}
          onChangeText={(text) => {
            setInviteCode(text);
            if (inviteCodeError) setInviteCodeError("");
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          error={inviteCodeError}
        />
      )}

      <PrimaryButton
        title="Create Account"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
      />

      <AuthFooter
        question="Already have an account?"
        action="Sign In"
        onPress={() =>
          router.replace({
            pathname: "/login",
            params: { role },
          })
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Reserved for future Register-specific styles.
});
