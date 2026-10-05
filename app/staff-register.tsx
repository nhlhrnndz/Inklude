// app/staff-register.tsx — Staff account creation (needs a staff code)
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
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

export default function StaffRegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setCodeError("");

    let valid = true;
    if (!name.trim() || !validateName(name)) {
      setNameError("Please enter your full name.");
      valid = false;
    }
    if (!email.trim() || !validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }
    if (!password || !validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    }
    if (!passwordsMatch(password, confirm)) {
      setConfirmError("Passwords do not match.");
      valid = false;
    }
    if (!code.trim()) {
      setCodeError("Please enter your staff registration code.");
      valid = false;
    }
    if (!valid) return;

    try {
      setLoading(true);
      const result = await register(
        name.trim(),
        email.trim(),
        password,
        code.trim(),
      );

      const label = result.role === "guidance" ? "Guidance" : "Teacher";
      Toast.show({
        type: "success",
        text1: "Staff account created",
        text2: `You can now sign in as ${label}.`,
      });
      setTimeout(() => router.replace("/staff-login" as any), 1200);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "We couldn't create your account.";
      if (err?.response?.status === 403) setCodeError(message);
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
      <View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
        <AuthHeader
          title="Create Staff Account"
          subtitle="For teachers and Guidance. You need a staff code."
        />

        <AuthInput
          label="Full Name"
          icon="person-outline"
          placeholder="Enter your full name"
          value={name}
          onChangeText={(t) => {
            setName(t);
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
          onChangeText={(t) => {
            setEmail(t);
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
          onChangeText={(t) => {
            setPassword(t);
            if (passwordError) setPasswordError("");
          }}
          returnKeyType="next"
          error={passwordError}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            if (confirmError) setConfirmError("");
          }}
          returnKeyType="next"
          error={confirmError}
        />

        <AuthInput
          label="Staff Registration Code"
          icon="key-outline"
          placeholder="Enter the code given to you"
          value={code}
          onChangeText={(t) => {
            setCode(t);
            if (codeError) setCodeError("");
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          error={codeError}
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
          onPress={() => router.replace("/staff-login" as any)}
        />
      </View>
    </ScreenContainer>
  );
}
