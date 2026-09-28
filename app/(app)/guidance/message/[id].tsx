// app/(app)/guidance/message/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../../../context/ThemeContext";
import {
    getGuidanceThread,
    MessageItem,
    MessageThreadInfo,
    MessageThreadStatus,
    replyToThread,
    updateThreadStatus,
} from "../../../../utils/api";

const STATUS_OPTIONS: { label: string; value: MessageThreadStatus }[] = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

export default function GuidanceThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [thread, setThread] = useState<MessageThreadInfo | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [reply, setReply] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const threadId = Number(id);

  const loadThread = useCallback(async () => {
    try {
      const res = await getGuidanceThread(threadId);
      setThread(res.thread);
      setMessages(res.messages);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load conversation",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (threadId) {
      loadThread();
    }
  }, [threadId, loadThread]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleReply = async () => {
    if (!reply.trim()) return;

    setSending(true);
    try {
      const res = await replyToThread(threadId, reply.trim());
      setThread(res.thread);
      setMessages(res.messages);
      setReply("");
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send reply",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: MessageThreadStatus) => {
    if (!thread || thread.status === status) return;

    setUpdatingStatus(true);
    try {
      await updateThreadStatus(threadId, status);
      setThread({ ...thread, status });
      Toast.show({
        type: "success",
        text1: `Marked as ${status.replace("_", " ")}`,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not update status",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading || !thread) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["left", "right", "bottom"]}
    >
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 4,
          paddingBottom: spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ marginRight: 10 }}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "700",
                color: colors.text,
              }}
              accessibilityRole="header"
              numberOfLines={1}
            >
              {thread.studentName}
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {thread.studentEmail} •{" "}
              {thread.category.charAt(0).toUpperCase() +
                thread.category.slice(1)}
              {thread.urgent ? " • Urgent" : ""}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", marginTop: spacing.sm }}>
          {STATUS_OPTIONS.map((opt) => {
            const active = thread.status === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleStatusChange(opt.value)}
                disabled={updatingStatus}
                accessibilityRole="button"
                accessibilityLabel={`Set status: ${opt.label}`}
                accessibilityState={{ selected: active }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.surface,
                  marginRight: 8,
                  opacity: updatingStatus ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => {
            const isMine = m.senderRole === "guidance";
            return (
              <View
                key={m.id}
                style={[
                  styles.bubbleRow,
                  { justifyContent: isMine ? "flex-end" : "flex-start" },
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isMine ? colors.primary : colors.surface,
                      borderColor: isMine ? colors.primary : colors.border,
                      borderRadius: radius.md,
                      padding: spacing.sm + 4,
                    },
                  ]}
                >
                  {!isMine && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: colors.primary,
                        marginBottom: 3,
                      }}
                    >
                      {m.senderName ?? thread.studentName}
                    </Text>
                  )}
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      color: isMine ? "#FFFFFF" : colors.text,
                    }}
                  >
                    {m.body}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: isMine ? "#FFFFFFAA" : colors.placeholder,
                      marginTop: 4,
                      alignSelf: "flex-end",
                    }}
                  >
                    {new Date(m.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.divider,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm + 4,
            backgroundColor: colors.background,
            flexDirection: "row",
            alignItems: "flex-end",
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
              maxHeight: 120,
              marginRight: spacing.sm,
            }}
            placeholder="Write a reply..."
            placeholderTextColor={colors.placeholder}
            value={reply}
            onChangeText={setReply}
            multiline
            accessibilityLabel="Reply to student"
          />

          <TouchableOpacity
            onPress={handleReply}
            disabled={sending || !reply.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            style={{
              width: 46,
              height: 46,
              borderRadius: radius.round,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: sending || !reply.trim() ? 0.5 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bubbleRow: { flexDirection: "row", marginBottom: 10 },
  bubble: { maxWidth: "80%", borderWidth: 1 },
});
