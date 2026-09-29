// app/(app)/documents.tsx
//
// Document Reader home: every handout from every classroom the student
// has joined. Tap one to have it read aloud.

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../context/ThemeContext";
import { useFeatures } from "../../hooks/useFeatures";
import { DocumentMeta, getMyDocuments } from "../../utils/documentApi";
import { speakPrompt } from "../../utils/speakPrompt";

export default function DocumentsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { hasFeature } = useFeatures();

  const wantsVoicePrompts = hasFeature("voice_navigation_prompts");
  const wantsLargeTargets = hasFeature("large_touch_targets");
  const wantsLargeText = hasFeature("large_text");

  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const announced = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyDocuments();
      const list = data.documents || [];
      setDocs(list);

      if (!announced.current) {
        announced.current = true;
        speakPrompt(
          wantsVoicePrompts,
          list.length === 0
            ? "You have no documents yet."
            : `You have ${list.length} document${
                list.length === 1 ? "" : "s"
              }. Tap one to listen.`,
        );
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      Toast.show({ type: "error", text1: "Could not load your documents" });
    } finally {
      setLoading(false);
    }
  }, [wantsVoicePrompts]);

  // Drawer screens stay mounted, so refresh every time this one is focused.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.replace("/student")}
          accessibilityRole="button"
          accessibilityLabel="Back to Student Dashboard"
          style={{
            flexDirection: "row",
            alignItems: "center",
            minHeight: 44,
            alignSelf: "flex-start",
            marginBottom: spacing.md,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.primary,
              fontWeight: "600",
              marginLeft: spacing.sm,
            }}
          >
            Back
          </Text>
        </TouchableOpacity>

        <Text
          accessibilityRole="header"
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
            marginBottom: 4,
          }}
        >
          Document Reader
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
          }}
        >
          Handouts shared by your teachers. Tap one to have it read aloud.
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.lg }}
          />
        ) : docs.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Ionicons
              name="document-text-outline"
              size={44}
              color={colors.textSecondary}
            />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: spacing.sm,
              }}
            >
              No documents yet.
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              When a teacher uploads a handout to a classroom you joined, it
              will show up here.
            </Text>
          </View>
        ) : (
          docs.map((d) => (
            <TouchableOpacity
              key={d.id}
              onPress={() => router.push(`/reader/${d.id}` as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${d.filename}. From ${
                d.sessionTitle ?? "a classroom"
              }${d.teacherName ? `, teacher ${d.teacherName}` : ""}. Uploaded ${new Date(
                d.createdAt,
              ).toLocaleDateString()}. Open in reader.`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginBottom: spacing.md,
                minHeight: wantsLargeTargets ? 96 : 76,
              }}
            >
              <Ionicons
                name={
                  d.mimeType?.startsWith("image/")
                    ? "image-outline"
                    : "document-text-outline"
                }
                size={wantsLargeText ? 34 : 28}
                color={colors.primary}
                style={{ marginRight: spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: wantsLargeText ? 22 : typography.title.fontSize,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {d.filename}
                </Text>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {d.sessionTitle ?? "Classroom"}
                  {d.teacherName ? ` · ${d.teacherName}` : ""}
                </Text>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  {new Date(d.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons
                name="play-circle-outline"
                size={34}
                color={colors.primary}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
