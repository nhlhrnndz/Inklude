// app/staff-login.tsx — Staff Portal login (Teacher + Guidance)
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import Toast from "react-native-toast-message";

import AuthFooter from "../components/auth/AuthFooter";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import PasswordInput from "../components/auth/PasswordInput";
import PrimaryButton from "../components/auth/PrimaryButton";
import ScreenContainer from "../components/common/ScreenContainer";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { validateEmail, validatePassword } from "../utils/validators/auth";

export default function StaffLoginScreen() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentNotice, setStudentNotice] = useState(false);

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");
    setStudentNotice(false);

    let valid = true;
    if (!email.trim() || !validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }
    if (!password || !validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    }
    if (!valid) return;

    try {
      setLoading(true);
      const user = await login(email.trim(), password);

      if (user.role === "teacher") {
        router.replace("/teacher");
      } else if (user.role === "guidance") {
        router.replace("/guidance-dashboard");
      } else {
        // Students use the mobile app, not the staff website.
        await logout();
        setStudentNotice(true);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: err?.response?.data?.message ?? "Incorrect email or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
        <AuthHeader
          title="Staff Portal"
          subtitle="Teachers and Guidance: sign in to IncluEd"
        />

        {studentNotice && (
          <View
            accessibilityRole="alert"
            style={{
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: colors.primaryLight + "1A",
              borderRadius: radius.lg,
              padding: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
              }}
            >
              This is the Staff Portal. Students, please use the IncluEd mobile
              app. You can download it from the home page.
            </Text>
          </View>
        )}

        <AuthInput
          label="Email"
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
          placeholder="Enter your password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (passwordError) setPasswordError("");
          }}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          error={passwordError}
        />

        <PrimaryButton
          title={loading ? "Signing In..." : "Sign In"}
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
        />

        <AuthFooter
          question="Need a staff account?"
          action="Create Staff Account"
          onPress={() => router.push("/staff-register" as any)}
        />

        <AuthFooter
          question="Not staff?"
          action="Back to home"
          onPress={() => router.replace("/")}
        />
      </View>
    </ScreenContainer>
  );
}
