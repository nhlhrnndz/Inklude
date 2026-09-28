// app/(app)/messages.tsx
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../context/ThemeContext";
import {
    getMyMessages,
    MessageCategory,
    MessageItem,
    MessageThreadInfo,
    sendMyMessage,
} from "../../utils/api";
import { getSocket } from "../../utils/socket";

const CATEGORIES: { label: string; value: MessageCategory }[] = [
  { label: "Help", value: "help" },
  { label: "Complaint", value: "complaint" },
  { label: "Concern", value: "concern" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "Guidance is on it",
  resolved: "Resolved",
};

export default function MessagesScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [thread, setThread] = useState<MessageThreadInfo | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [category, setCategory] = useState<MessageCategory>("help");
  const [urgent, setUrgent] = useState(false);
  const [body, setBody] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadThread = useCallback(async () => {
    try {
      const res = await getMyMessages();
      setThread(res.thread);
      setMessages(res.messages);

      if (res.thread) {
        setCategory(res.thread.category);
        setUrgent(res.thread.urgent);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load messages",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  // Live-update when guidance replies, instead of waiting for the
  // student to send another message before the reply shows up.
  useEffect(() => {
    const socket = getSocket();

    const handleNew = (payload: { sourceType: string | null }) => {
      if (payload.sourceType === "message_thread") {
        loadThread();
      }
    };

    socket.on("notification:new", handleNew);

    return () => {
      socket.off("notification:new", handleNew);
    };
  }, [loadThread]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!body.trim()) {
      return;
    }

    setSending(true);
    try {
      const res = await sendMyMessage({
        body: body.trim(),
        category,
        urgent,
      });
      setThread(res.thread);
      setMessages(res.messages);
      setBody("");
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send message",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const statusColors = () => {
    if (!thread)
      return { bg: colors.secondaryBackground, text: colors.textSecondary };
    if (thread.status === "resolved")
      return { bg: colors.success + "18", text: colors.success };
    if (thread.status === "in_progress")
      return { bg: colors.warning + "18", text: colors.warning };
    return { bg: colors.secondaryBackground, text: colors.textSecondary };
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading messages"
        />
      </SafeAreaView>
    );
  }

  const sc = statusColors();

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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
            accessibilityRole="header"
          >
            Guidance
          </Text>
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            Privately reach out to the guidance office.
          </Text>
        </View>

        {thread && (
          <View
            style={{
              backgroundColor: sc.bg,
              borderRadius: radius.sm,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: sc.text, fontWeight: "700", fontSize: 12 }}>
              {STATUS_LABEL[thread.status]}
            </Text>
          </View>
        )}
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
            paddingBottom: spacing.lg,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="heart-outline"
                size={36}
                color={colors.textSecondary}
              />
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: spacing.sm,
                  maxWidth: 260,
                }}
              >
                Send a message below and it will go straight to the guidance
                office. Only you and guidance can see it.
              </Text>
            </View>
          ) : (
            messages.map((m) => {
              const isMine = m.senderRole === "student";
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
                        backgroundColor: isMine
                          ? colors.primary
                          : colors.surface,
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
                        {m.senderName ?? "Guidance"}
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
            })
          )}
        </ScrollView>

        {/* Composer */}
        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.divider,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm + 4,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${c.label}`}
                  accessibilityState={{ selected: active }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.surface,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: active ? "#FFFFFF" : colors.textSecondary,
                    }}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={{ flex: 1 }} />

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: urgent ? colors.danger : colors.textSecondary,
                  marginRight: 6,
                }}
              >
                Urgent
              </Text>
              <Switch
                value={urgent}
                onValueChange={setUrgent}
                trackColor={{
                  false: colors.disabled,
                  true: colors.danger + "AA",
                }}
                thumbColor={urgent ? colors.danger : colors.surface}
                accessibilityLabel="Mark as urgent"
                accessibilityRole="switch"
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
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
              placeholder="Write to guidance..."
              placeholderTextColor={colors.placeholder}
              value={body}
              onChangeText={setBody}
              multiline
              accessibilityLabel="Message to guidance"
            />

            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || !body.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={{
                width: 46,
                height: 46,
                borderRadius: radius.round,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: sending || !body.trim() ? 0.5 : 1,
              }}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 60,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  bubble: {
    maxWidth: "80%",
    borderWidth: 1,
  },
});
