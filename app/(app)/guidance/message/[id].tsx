// app/(app)/guidance/message/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { useLiveRefresh } from "../../../../hooks/useLiveRefresh";
import {
  getGuidanceThread,
  MessageItem,
  MessageThreadInfo,
  replyToThread,
} from "../../../../utils/api";

// A cheap fingerprint of what's on screen, so background refreshes only
// re-render when something actually changed.
function buildSignature(
  thread: MessageThreadInfo | null,
  messages: MessageItem[],
) {
  const last = messages[messages.length - 1];

  return [
    thread?.id ?? 0,
    thread?.updatedAt ?? "",
    messages.length,
    last?.id ?? 0,
  ].join("|");
}

export default function GuidanceThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const nearBottomRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const signatureRef = useRef("");
  const lastCountRef = useRef(0);
  const lastMutationRef = useRef(0);

  const [thread, setThread] = useState<MessageThreadInfo | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [reply, setReply] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const threadId = Number(id);

  // Quiet refresh: no spinner, no toast (except if the very first load
  // fails), and no state updates unless something changed.
  const syncThread = useCallback(async () => {
    if (!threadId) return;

    const startedAt = Date.now();

    try {
      const res = await getGuidanceThread(threadId);

      // If guidance replied while this request was in flight, the
      // response may be stale. The next refresh catches up.
      if (lastMutationRef.current > startedAt) return;

      hasLoadedRef.current = true;

      const signature = buildSignature(res.thread, res.messages);

      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setThread(res.thread);
        setMessages(res.messages);
      }
    } catch (err: any) {
      if (!hasLoadedRef.current) {
        Toast.show({
          type: "error",
          text1: "Failed to load conversation",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  // Only reacts to notifications about THIS thread, plus reconnects,
  // foreground, and a light timer while the screen is open.
  useLiveRefresh(syncThread, { sourceId: threadId });

  // Keep the newest message in view, but never yank the screen away from
  // someone who scrolled up to read older messages.
  useEffect(() => {
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    const grew = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;

    if (grew && (nearBottomRef.current || last.senderRole === "guidance")) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);

    nearBottomRef.current = distanceFromBottom < 120;
  };

  const handleReply = async () => {
    if (!reply.trim()) return;

    setSending(true);
    try {
      const res = await replyToThread(threadId, reply.trim());

      lastMutationRef.current = Date.now();
      signatureRef.current = buildSignature(res.thread, res.messages);

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
              {thread.studentEmail}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={100}
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
