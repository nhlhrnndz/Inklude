// app/(app)/messages.tsx
import { Ionicons } from "@expo/vector-icons";
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

import { useTheme } from "../../context/ThemeContext";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import {
  getMyMessages,
  MessageItem,
  MessageThreadInfo,
  sendMyMessage,
} from "../../utils/api";

// Cheap fingerprint so background refreshes only re-render on real changes.
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

export default function MessagesScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const nearBottomRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const signatureRef = useRef("");
  const lastCountRef = useRef(0);
  const lastMutationRef = useRef(0);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const syncThread = useCallback(async () => {
    const startedAt = Date.now();

    try {
      const res = await getMyMessages();

      // A send happened while this request was in flight; skip the stale response.
      if (lastMutationRef.current > startedAt) return;

      hasLoadedRef.current = true;

      const signature = buildSignature(res.thread, res.messages);
      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setMessages(res.messages);
      }
    } catch (err: any) {
      if (!hasLoadedRef.current) {
        Toast.show({
          type: "error",
          text1: "Failed to load messages",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(syncThread);

  useEffect(() => {
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    const grew = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;

    if (grew && (nearBottomRef.current || last.senderRole === "student")) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    nearBottomRef.current =
      contentSize.height - (contentOffset.y + layoutMeasurement.height) < 120;
  };

  const handleSend = async () => {
    if (!body.trim()) return;

    setSending(true);
    try {
      const res = await sendMyMessage({ body: body.trim() });

      lastMutationRef.current = Date.now();
      signatureRef.current = buildSignature(res.thread, res.messages);

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
          Privately message the Guidance Office.
        </Text>
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
                Send a message below and it will go straight to the Guidance
                Office. Only you and Guidance can see it.
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
            placeholder="Write to Guidance..."
            placeholderTextColor={colors.placeholder}
            value={body}
            onChangeText={setBody}
            multiline
            accessibilityLabel="Message to Guidance"
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
  bubbleRow: { flexDirection: "row", marginBottom: 10 },
  bubble: { maxWidth: "80%", borderWidth: 1 },
});
