import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../context/ThemeContext";
import { saveMyBasicInfo } from "../../utils/api";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function BasicInfoScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();

  const [yearLevel, setYearLevel] = useState("");
  const [age, setAge] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [course, setCourse] = useState("");
  const [section, setSection] = useState("");
  const [saving, setSaving] = useState(false);

  const isValid =
    yearLevel.trim() &&
    age.trim() &&
    !Number.isNaN(Number(age)) &&
    dateOfBirth.trim() &&
    course.trim() &&
    section.trim();

  const handleNext = async () => {
    if (!isValid) {
      Toast.show({
        type: "error",
        text1: "Missing information",
        text2: "Please fill in every field before continuing.",
      });
      return;
    }

    try {
      setSaving(true);

      await saveMyBasicInfo({
        yearLevel,
        age: Number(age),
        dateOfBirth,
        course,
        section,
      });

      router.replace(onboarding === "1" ? "/sis" : "/student");
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not save",
        text2:
          err?.response?.data?.message ??
          "We couldn't save your information. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    options?: { placeholder?: string; keyboardType?: "default" | "numeric" },
  ) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={options?.keyboardType ?? "default"}
        style={{
          minHeight: 48,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          color: colors.text,
          backgroundColor: colors.surface,
        }}
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
            marginBottom: 6,
          }}
          accessibilityRole="header"
        >
          Basic Information
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
          }}
        >
          Tell us a bit more about you. This step is required before you can
          continue.
        </Text>

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginBottom: spacing.sm,
          }}
        >
          Year Level
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginBottom: spacing.md,
          }}
        >
          {YEAR_LEVELS.map((level) => {
            const selected = yearLevel === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => setYearLevel(level)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  borderWidth: 1,
                  borderRadius: radius.xl,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : "transparent",
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: selected ? "#FFFFFF" : colors.text,
                    fontWeight: selected ? "600" : "400",
                  }}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderInput("Age", age, setAge, {
          placeholder: "Enter your age",
          keyboardType: "numeric",
        })}
        {renderInput("Date of Birth", dateOfBirth, setDateOfBirth, {
          placeholder: "YYYY-MM-DD",
        })}
        {renderInput("Course", course, setCourse, {
          placeholder: "e.g. BSIT",
        })}
        {renderInput("Section", section, setSection, {
          placeholder: "e.g. NT-3301",
        })}

        <TouchableOpacity
          onPress={handleNext}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Next"
          style={{
            backgroundColor: saving ? colors.disabled : colors.primary,
            borderRadius: radius.md,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: spacing.md,
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
