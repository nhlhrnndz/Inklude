// app/(app)/report-issue.tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../context/ThemeContext";
import {
    REPORT_CATEGORIES,
    submitAccessibilityReport,
} from "../../utils/reportApi";

export default function ReportIssueScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius, a11y } = useTheme();

  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const minHeight = a11y.largerButtons ? 56 : 48;

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Camera permission needed",
        text2: "Allow camera access, or choose a photo instead.",
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (location.trim().length < 2) {
      Toast.show({ type: "error", text1: "Enter the location" });
      return;
    }
    if (!category) {
      Toast.show({ type: "error", text1: "Choose a category" });
      return;
    }
    if (description.trim().length < 5) {
      Toast.show({ type: "error", text1: "Describe the problem" });
      return;
    }

    setSubmitting(true);
    try {
      await submitAccessibilityReport(
        {
          location: location.trim(),
          category,
          description: description.trim(),
        },
        photoUri,
      );
      Toast.show({
        type: "success",
        text1: "Report sent",
        text2: "Guidance will update you on its status.",
      });
      router.replace("/my-reports" as any);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send report",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const label = (text: string) => (
    <Text
      style={{
        fontFamily: typography.body.fontFamily,
        fontSize: typography.body.fontSize,
        fontWeight: "700",
        color: colors.text,
        marginBottom: spacing.sm,
      }}
    >
      {text}
    </Text>
  );

  const inputStyle = {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
    minHeight,
  };

  const outlineButton = {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    minHeight,
    gap: 8,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                flex: 1,
                fontFamily: typography.h2.fontFamily,
                fontSize: typography.h2.fontSize,
                fontWeight: typography.h2.fontWeight,
                color: colors.text,
              }}
              accessibilityRole="header"
            >
              Report an Issue
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/my-reports" as any)}
              accessibilityRole="button"
              accessibilityLabel="View my reports"
              hitSlop={8}
            >
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                My reports
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.textSecondary,
              marginTop: 4,
              marginBottom: spacing.lg,
            }}
          >
            Tell Guidance about an accessibility barrier on campus, such as a
            broken ramp or an elevator that is out of service.
          </Text>

          {label("Where is the problem?")}
          <TextInput
            style={inputStyle}
            placeholder="e.g. Library, 2nd floor"
            placeholderTextColor={colors.placeholder}
            value={location}
            onChangeText={setLocation}
            maxLength={150}
            accessibilityLabel="Location of the problem"
          />

          <View style={{ height: spacing.lg }} />

          {label("What kind of problem is it?")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {REPORT_CATEGORIES.map((c) => {
              const selected = category === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={c}
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderRadius: radius.xl,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                    minHeight: a11y.largerButtons ? 48 : 40,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize,
                      fontWeight: "700",
                      color: selected ? "#FFFFFF" : colors.text,
                    }}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: spacing.lg }} />

          {label("Describe the problem")}
          <TextInput
            style={[inputStyle, { minHeight: 110, textAlignVertical: "top" }]}
            placeholder="What is wrong, and how does it affect you?"
            placeholderTextColor={colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
            accessibilityLabel="Description of the problem"
          />

          <View style={{ height: spacing.lg }} />

          {label("Photo (optional)")}
          {photoUri ? (
            <View>
              <Image
                source={{ uri: photoUri }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: radius.md,
                  backgroundColor: colors.secondaryBackground,
                }}
                resizeMode="cover"
                accessibilityLabel="Selected photo"
              />
              <TouchableOpacity
                onPress={() => setPhotoUri(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                style={{
                  alignSelf: "flex-start",
                  marginTop: spacing.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
                hitSlop={8}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.danger}
                />
                <Text style={{ color: colors.danger, fontWeight: "700" }}>
                  Remove photo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {Platform.OS !== "web" && (
                <TouchableOpacity
                  onPress={takePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Take a photo"
                  style={outlineButton}
                >
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    Take photo
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={pickFromLibrary}
                accessibilityRole="button"
                accessibilityLabel="Choose a photo from your gallery"
                style={outlineButton}
              >
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Choose photo
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Submit report"
            accessibilityState={{ disabled: submitting }}
            style={{
              backgroundColor: submitting ? colors.disabled : colors.primary,
              borderRadius: radius.md,
              minHeight: minHeight + 4,
              alignItems: "center",
              justifyContent: "center",
              marginTop: spacing.xl,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                }}
              >
                Submit report
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
