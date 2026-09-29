// components/SessionDocuments.tsx
//
// "Documents" tab of a classroom. Teachers can upload and delete handouts;
// everyone in the classroom can open one in the Document Reader.

import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import { useFeatures } from "../hooks/useFeatures";
import { crossAlert } from "../utils/crossAlert";
import {
    DocumentMeta,
    deleteDocument,
    getSessionDocuments,
    uploadDocument,
} from "../utils/documentApi";
import { speakPrompt } from "../utils/speakPrompt";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const MAX_BYTES = 15 * 1024 * 1024;

export default function SessionDocuments({
  sessionId,
  isTeacher,
}: {
  sessionId: number;
  isTeacher: boolean;
}) {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { hasFeature } = useFeatures();
  const wantsVoicePrompts = hasFeature("voice_navigation_prompts");

  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getSessionDocuments(sessionId);
      setDocs(data.documents || []);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    if (uploading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_BYTES) {
        Toast.show({
          type: "error",
          text1: "File too large",
          text2: "The limit is 15 MB.",
        });
        return;
      }

      setUploading(true);
      speakPrompt(wantsVoicePrompts, "Uploading document. Please wait.");

      await uploadDocument(sessionId, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        webFile: (asset as any).file ?? null,
      });

      Toast.show({
        type: "success",
        text1: "Document uploaded",
        text2: "Students have been notified.",
      });
      speakPrompt(wantsVoicePrompts, "Document ready.");
      await load();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Could not upload",
        text2: error.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: DocumentMeta) => {
    crossAlert("Remove this document?", `${doc.filename} will be deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDocument(doc.id);
            load();
          } catch {
            Toast.show({ type: "error", text1: "Could not remove it" });
          }
        },
      },
    ]);
  };

  return (
    <View>
      {isTeacher && (
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Upload a document"
          accessibilityHint="Choose a PDF, Word file, or image to share with the class"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            minHeight: 52,
            marginBottom: spacing.md,
            opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  marginLeft: spacing.sm,
                  fontFamily: typography.button.fontFamily,
                  fontSize: typography.button.fontSize,
                  fontWeight: "700",
                }}
              >
                Reading your file…
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  marginLeft: spacing.sm,
                  fontFamily: typography.button.fontFamily,
                  fontSize: typography.button.fontSize,
                  fontWeight: "700",
                }}
              >
                Upload document
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {isTeacher && (
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.md,
          }}
        >
          PDF, Word (.docx), JPG or PNG, up to 15 MB. Photos of printed pages
          are read with text recognition, so this can take a moment.
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : docs.length === 0 ? (
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
          }}
        >
          {isTeacher
            ? "No documents yet. Upload a handout for your students."
            : "No documents have been shared in this classroom yet."}
        </Text>
      ) : (
        docs.map((d) => (
          <View
            key={d.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              marginBottom: spacing.sm,
            }}
          >
            <TouchableOpacity
              onPress={() => router.push(`/reader/${d.id}` as any)}
              accessibilityRole="button"
              accessibilityLabel={`${d.filename}, uploaded ${new Date(
                d.createdAt,
              ).toLocaleDateString()}. Open in reader.`}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                padding: spacing.md,
                minHeight: 64,
              }}
            >
              <Ionicons
                name={
                  d.mimeType?.startsWith("image/")
                    ? "image-outline"
                    : "document-text-outline"
                }
                size={26}
                color={colors.primary}
                style={{ marginRight: spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
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
                    marginTop: 2,
                  }}
                >
                  {new Date(d.createdAt).toLocaleDateString()} · Tap to listen
                </Text>
              </View>
              <Ionicons
                name="volume-high-outline"
                size={22}
                color={colors.primary}
              />
            </TouchableOpacity>

            {isTeacher && (
              <TouchableOpacity
                onPress={() => handleDelete(d)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${d.filename}`}
                style={{
                  width: 48,
                  minHeight: 64,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </View>
  );
}
