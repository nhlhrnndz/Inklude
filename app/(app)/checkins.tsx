// app/(app)/checkins.tsx
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
    CHECKIN_REPLIES,
    CheckinItem,
    getReceivedCheckins,
    getSentCheckins,
    replyToCheckin,
} from "../../utils/checkinApi";
import { getSocket } from "../../utils/socket";

const REPLY_MAX = 200;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CheckinsScreen() {
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";

  const [items, setItems] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      if (isStudent) {
        const res = await getReceivedCheckins();
        setItems(res.checkins);
      } else if (isTeacher) {
        const res = await getSentCheckins();
        setItems(res.checkins);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load check-ins",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStudent, isTeacher]);

  useEffect(() => {
    load();
  }, [load]);

  // Live-update when a check-in or a reply arrives
  useEffect(() => {
    const socket = getSocket();
    const handleNew = (payload: { sourceType: string | null }) => {
      if (payload.sourceType === "checkin") load();
    };
    socket.on("notification:new", handleNew);
    return () => {
      socket.off("notification:new", handleNew);
    };
  }, [load]);

  const sendReply = async (item: CheckinItem, reply: string) => {
    const text = reply.trim();
    if (!text) return;

    setBusyId(item.id);
    try {
      const res = await replyToCheckin(item.id, text);
      setItems((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, ...res.checkin } : c)),
      );
      Toast.show({
        type: "success",
        text1: "Reply sent",
        text2:
          text === "I need help"
            ? "Your teacher and the guidance office were told."
            : undefined,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send reply",
        text2: err.response?.data?.message ?? "Please try again.",
      });
      if (err.response?.status === 409) load();
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: CheckinItem }) => {
    const replied = !!item.reply;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {isStudent
            ? (item.teacherName ?? "Your teacher")
            : `To ${item.studentName ?? "student"}`}
        </Text>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: 11,
            color: colors.placeholder,
            marginTop: 2,
          }}
        >
          {formatWhen(item.sentAt)}
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.text,
            marginTop: 8,
          }}
        >
          {item.message}
        </Text>

        {replied ? (
          <View
            style={[
              styles.replyBox,
              {
                backgroundColor: colors.secondaryBackground,
                borderRadius: radius.sm,
                padding: spacing.sm + 2,
                marginTop: spacing.sm,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: 11,
                fontWeight: "700",
                color: colors.textSecondary,
              }}
            >
              {isStudent ? "Your reply" : "Student's reply"}
              {item.repliedAt ? ` • ${formatWhen(item.repliedAt)}` : ""}
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color:
                  item.reply === "I need help" ? colors.danger : colors.text,
                fontWeight: item.reply === "I need help" ? "700" : "400",
                marginTop: 2,
              }}
            >
              {item.reply}
            </Text>
          </View>
        ) : isStudent ? (
          <View style={{ marginTop: spacing.sm }}>
            <View style={styles.replyButtons}>
              {CHECKIN_REPLIES.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => sendReply(item, r)}
                  disabled={busyId === item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Reply: ${r}`}
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor:
                      r === "I need help" ? colors.danger : colors.primary,
                    backgroundColor: colors.surface,
                    marginRight: 8,
                    marginBottom: 8,
                    opacity: busyId === item.id ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.caption.fontSize,
                      fontWeight: "700",
                      color:
                        r === "I need help" ? colors.danger : colors.primary,
                    }}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.freeRow}>
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
                  marginRight: spacing.sm,
                }}
                value={drafts[item.id] ?? ""}
                onChangeText={(t) =>
                  setDrafts((prev) => ({ ...prev, [item.id]: t }))
                }
                maxLength={REPLY_MAX}
                placeholder="Or write your own reply..."
                placeholderTextColor={colors.placeholder}
                accessibilityLabel="Write your own reply"
              />
              <TouchableOpacity
                onPress={() => sendReply(item, drafts[item.id] ?? "")}
                disabled={busyId === item.id || !(drafts[item.id] ?? "").trim()}
                accessibilityRole="button"
                accessibilityLabel="Send reply"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: radius.round,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity:
                    busyId === item.id || !(drafts[item.id] ?? "").trim()
                      ? 0.5
                      : 1,
                }}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: 11,
                color: colors.placeholder,
                marginTop: 4,
              }}
            >
              You can reply once.
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              fontStyle: "italic",
              marginTop: spacing.sm,
            }}
          >
            No reply yet.
          </Text>
        )}
      </View>
    );
  };

  if (!isStudent && !isTeacher) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <Text
          style={{ color: colors.text, fontFamily: typography.body.fontFamily }}
        >
          Check-ins are for teachers and students.
        </Text>
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
          paddingTop: spacing.md,
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
          Check-ins
        </Text>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {isStudent
            ? "Messages from your teachers."
            : "Check-ins you sent and how students replied."}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading check-ins"
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="heart-outline"
                size={40}
                color={colors.textSecondary}
              />
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.textSecondary,
                  marginTop: spacing.sm,
                  textAlign: "center",
                }}
              >
                {isStudent
                  ? "No check-ins yet."
                  : "You haven't sent any check-ins yet."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: { borderWidth: 1 },
  replyBox: {},
  replyButtons: { flexDirection: "row", flexWrap: "wrap" },
  freeRow: { flexDirection: "row", alignItems: "center" },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});
