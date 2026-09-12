//edit-profile.tsx
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

import AuthInput from "../../components/auth/AuthInput";
import PrimaryButton from "../../components/auth/PrimaryButton";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import { updateProfileInfo } from "../../utils/api";
import { validateEmail, validateName } from "../../utils/validators/auth";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setNameError("");
    setEmailError("");

    let isValid = true;

    if (!name.trim()) {
      setNameError("Please enter your full name.");
      isValid = false;
    } else if (!validateName(name)) {
      setNameError("Please enter a valid full name.");
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError("Please enter your email.");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
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

      const res = await updateProfileInfo(name.trim(), email.trim());
      await updateUser(res.user);

      Toast.show({
        type: "success",
        text1: "Profile Updated",
        text2: "Your changes have been saved.",
      });

      router.back();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "We couldn't update your profile. Please try again.";

      Toast.show({
        type: "error",
        text1: "Update Failed",
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
            Edit Profile
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
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
            label="Email"
            icon="mail-outline"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            error={emailError}
          />

          <PrimaryButton
            title="Save Changes"
            onPress={handleSave}
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
