//basic-info.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { COLLEGES } from "../../constants/courses";
import { useTheme } from "../../context/ThemeContext";
import { getMyBasicInfo, saveMyBasicInfo } from "../../utils/api";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const COURSE_SECTIONS = COLLEGES.map((college) => ({
  title: college.code,
  data: college.courses,
}));

export default function BasicInfoScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { onboarding, edit } = useLocalSearchParams<{
    onboarding?: string;
    edit?: string;
  }>();

  const isEditMode = edit === "1";

  const [yearLevel, setYearLevel] = useState("");
  const [age, setAge] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [course, setCourse] = useState("");
  const [section, setSection] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coursePickerVisible, setCoursePickerVisible] = useState(false);

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const existing = await getMyBasicInfo();

        if (existing) {
          setYearLevel(existing.yearLevel ?? "");
          setAge(existing.age != null ? String(existing.age) : "");
          setDateOfBirth(existing.dateOfBirth ?? "");
          setCourse(existing.course ?? "");
          setSection(existing.section ?? "");
        }
      } catch (err) {
        // 404 just means the student hasn't filled this in yet — that's fine.
      } finally {
        setLoading(false);
      }
    };

    loadExisting();
  }, []);

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

      if (isEditMode) {
        router.back();
        return;
      }

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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        {isEditMode && (
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[
              styles.backButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={{ color: colors.text, marginLeft: 6 }}>Back</Text>
          </TouchableOpacity>
        )}

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
          {isEditMode
            ? "Update your basic information. This keeps your Student Information Sheet in sync automatically."
            : "Tell us a bit more about you. This step is required before you can continue."}
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

        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 6,
            }}
          >
            Course
          </Text>

          <TouchableOpacity
            onPress={() => setCoursePickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select course"
            style={{
              minHeight: 48,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: course ? colors.text : colors.textSecondary,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {course || "Select your program or course"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {renderInput("Section", section, setSection, {
          placeholder: "e.g. NT-3301",
        })}

        <TouchableOpacity
          onPress={handleNext}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isEditMode ? "Save" : "Next"}
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
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {isEditMode ? "Save" : "Next"}
              </Text>
              <Ionicons
                name={isEditMode ? "checkmark" : "arrow-forward"}
                size={18}
                color="#FFFFFF"
              />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={coursePickerVisible}
        animationType="slide"
        onRequestClose={() => setCoursePickerVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Select Course
            </Text>

            <TouchableOpacity
              onPress={() => setCoursePickerVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <SectionList
            sections={COURSE_SECTIONS}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderSectionHeader={({ section: { title } }) => (
              <View
                style={{
                  backgroundColor: colors.secondaryBackground,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 12,
                    color: colors.textSecondary,
                    letterSpacing: 0.5,
                  }}
                >
                  {title}
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const selected = item === course;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setCourse(item);
                    setCoursePickerVisible(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                  style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: selected
                      ? colors.primaryLight + "18"
                      : colors.background,
                  }}
                >
                  <Text style={{ color: colors.text, flex: 1 }}>{item}</Text>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
