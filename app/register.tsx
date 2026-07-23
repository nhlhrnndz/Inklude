import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import Toast from "react-native-toast-message";

import AuthFooter from "../components/auth/AuthFooter";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import PasswordInput from "../components/auth/PasswordInput";
import PrimaryButton from "../components/auth/PrimaryButton";
import ScreenContainer from "../components/common/ScreenContainer";

import { useAuth } from "../context/AuthContext";
import Colors from "../theme/colors";
import { passwordsMatch, validateEmail, validateName, validatePassword } from "../utils/validators/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const { role: roleParam } =
    useLocalSearchParams<{ role?: string }>();

  const role: "student" | "teacher" =
    roleParam === "teacher" ? "teacher" : "student";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] =
    useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Clear previous errors
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    let isValid = true;

    // Validate Full Name
    if (!name.trim()) {
      setNameError("Please enter your full name.");
      isValid = false;
    } else if (!validateName(name)) {
      setNameError("Please enter a valid full name.");
      isValid = false;
    }

    // Validate Email
    if (!email.trim()) {
      setEmailError("Please enter your university email.");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    // Validate Password
    if (!password) {
      setPasswordError("Please create a password.");
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError(
        "Password must be at least 8 characters.",
      );
      isValid = false;
    }

    // Validate Confirm Password
    if (!confirmPassword) {
      setConfirmPasswordError(
        "Please confirm your password.",
      );
      isValid = false;
    } else if (!passwordsMatch(password, confirmPassword)) {
      setConfirmPasswordError("Passwords do not match.");
      isValid = false;
    }

    // Stop if validation failed
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

      await register(
        name.trim(),
        email.trim(),
        password,
        role,
      );

      Toast.show({
        type: "success",
        text1: "Account Created!",
        text2: "Your account was created successfully.",
      });

      // Give the toast a moment to display
      setTimeout(() => {
        router.replace({
          pathname: "/login",
          params: { role },
        });
      }, 1200);
    } catch (err: any) {
      console.error("Registration Error:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "We couldn't create your account. Please try again.";

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

          if (nameError) {
            setNameError("");
          }
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

          if (emailError) {
            setEmailError("");
          }
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

          if (passwordError) {
            setPasswordError("");
          }

          // Automatically clear mismatch error
          // when the user changes the password
          if (confirmPasswordError) {
            setConfirmPasswordError("");
          }
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

          if (confirmPasswordError) {
            setConfirmPasswordError("");
          }
        }}
        returnKeyType="done"
        onSubmitEditing={handleRegister}
        error={confirmPasswordError}
      />

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