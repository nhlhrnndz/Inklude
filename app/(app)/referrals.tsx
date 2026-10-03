// app/(app)/referrals.tsx
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import {
    acknowledgeReferral,
    getMyReferrals,
    ReferralStatus,
    respondToReferral,
    SupportReferral,
} from "../../utils/api";

type Tab = "open" | "done";

const STATUS_LABEL: Record<ReferralStatus, string> = {
  sent: "New",
  acknowledged: "Acknowledged",
  responded: "Replied",
};

function formatDay(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TeacherReferralsScreen() {
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [referrals, setReferrals] = useState<SupportReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("open");

  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const keyRef = useRef("");

  const load = useCallback(async (showErrors = false) => {
    try {
      const res = await getMyReferrals();
      const key = JSON.stringify(res.referrals);

      if (key !== keyRef.current) {
        keyRef.current = key;
        setReferrals(res.referrals);
      }
      setError(false);
    } catch (err: any) {
      if (keyRef.current === "") setError(true);
      if (showErrors) {
        Toast.show({
          type: "error",
          text1: "Failed to load referrals",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Refreshes on focus, on a "support_referral" notification, and every 20s
  useLiveRefresh(() => load(false), {
    sourceType: "support_referral",
    intervalMs: 20000,
  });

  const replaceOne = (updated: SupportReferral) => {
    setReferrals((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  };

  const handleAcknowledge = async (id: number) => {
    setBusyId(id);
    try {
      const res = await acknowledgeReferral(id);
      replaceOne(res.referral);
      Toast.show({ type: "success", text1: "Acknowledged" });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not acknowledge",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReply = async (id: number) => {
    if (!replyText.trim()) {
      Toast.show({ type: "error", text1: "Write a short reply first." });
      return;
    }

    setBusyId(id);
    try {
      const res = await respondToReferral(id, replyText.trim());
      replaceOne(res.referral);
      setReplyingId(null);
      setReplyText("");
      Toast.show({ type: "success", text1: "Reply sent to Guidance" });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send reply",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const openList = useMemo(
    () => referrals.filter((r) => r.status !== "responded"),
    [referrals],
  );
  const doneList = useMemo(
    () => referrals.filter((r) => r.status === "responded"),
    [referrals],
  );
  const visible = tab === "open" ? openList : doneList;

  const statusColors = (status: ReferralStatus) => {
    switch (status) {
      case "sent":
        return { bg: colors.warning + "22", border: colors.warning };
      case "acknowledged":
        return { bg: colors.primaryLight + "1A", border: colors.primary };
      default:
        return { bg: colors.success + "1A", border: colors.success };
    }
  };

  const captionStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  };

  const bodyStyle = {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
  };

  if (user?.role !== "teacher") {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <Text style={[bodyStyle, { textAlign: "center", marginTop: 60 }]}>
          This page is for teachers.
        </Text>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: SupportReferral }) => {
    const badge = statusColors(item.status);
    const busy = busyId === item.id;
    const replying = replyingId === item.id;

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
        accessibilityLabel={`Referral for ${item.studentName} in ${item.classTitle}. ${item.concern}. ${STATUS_LABEL[item.status]}.`}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={[bodyStyle, { fontWeight: "700" }]}>
              {item.studentName}
            </Text>
            <Text style={[captionStyle, { marginTop: 1 }]}>
              {item.classTitle} • {formatDay(item.createdAt)}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: badge.bg,
              borderColor: badge.border,
              borderWidth: 1,
              borderRadius: radius.sm,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{ fontSize: 11, fontWeight: "700", color: colors.text }}
            >
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: colors.secondaryBackground,
            borderRadius: radius.sm,
            paddingHorizontal: 9,
            paddingVertical: 4,
            marginTop: spacing.sm + 2,
          }}
        >
          <Text
            style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}
          >
            {item.concern}
          </Text>
        </View>

        {!!item.note && (
          <Text style={[bodyStyle, { marginTop: spacing.sm, lineHeight: 21 }]}>
            {item.note}
          </Text>
        )}

        <Text style={[captionStyle, { marginTop: spacing.sm }]}>
          From {item.guidanceName || "Guidance"}
        </Text>

        {item.status === "responded" && (
          <View
            style={{
              backgroundColor: colors.secondaryBackground,
              borderRadius: radius.md,
              padding: spacing.sm + 4,
              marginTop: spacing.sm + 2,
            }}
          >
            <Text style={[captionStyle, { fontWeight: "700" }]}>
              Your reply • {formatDay(item.respondedAt)}
            </Text>
            <Text style={[bodyStyle, { marginTop: 4, lineHeight: 21 }]}>
              {item.teacherResponse}
            </Text>
          </View>
        )}

        {item.status !== "responded" && !replying && (
          <View
            style={{ flexDirection: "row", gap: 10, marginTop: spacing.md }}
          >
            {item.status === "sent" && (
              <TouchableOpacity
                onPress={() => handleAcknowledge(item.id)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Acknowledge referral"
                style={[
                  styles.actionBtn,
                  {
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    backgroundColor: colors.surface,
                    opacity: busy ? 0.5 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={{ fontWeight: "700", color: colors.primary }}>
                    Acknowledge
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                setReplyingId(item.id);
                setReplyText("");
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Reply to Guidance"
              style={[
                styles.actionBtn,
                {
                  borderColor: colors.primary,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
                Reply to Guidance
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {replying && (
          <View style={{ marginTop: spacing.md }}>
            <TextInput
              style={{
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                minHeight: 90,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
              }}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="e.g. I'll check in with the student this week."
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={500}
              textAlignVertical="top"
              accessibilityLabel="Reply to Guidance"
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => setReplyingId(null)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Cancel reply"
                style={[
                  styles.actionBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text
                  style={{ fontWeight: "700", color: colors.textSecondary }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReply(item.id)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Send reply"
                style={[
                  styles.actionBtn,
                  {
                    flex: 1.5,
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    backgroundColor: colors.primary,
                    opacity: busy ? 0.5 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
                    Send reply
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
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
          Guidance Support Referrals
        </Text>

        <Text style={[captionStyle, { marginTop: 4, lineHeight: 18 }]}>
          Guidance may ask you to follow up with a student in one of your
          classes. You see the class, the concern and their note only.
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
          {(
            [
              { key: "open", label: `Open (${openList.length})` },
              { key: "done", label: `Replied (${doneList.length})` },
            ] as { key: Tab; label: string }[]
          ).map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
                style={{
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderRadius: radius.xl,
                  paddingHorizontal: spacing.sm + 8,
                  paddingVertical: spacing.sm,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    fontWeight: "700",
                    color: active ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading referrals"
        />
      ) : error && referrals.length === 0 ? (
        <View style={{ alignItems: "center", padding: spacing.lg }}>
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.textSecondary}
          />
          <Text
            style={[bodyStyle, { marginTop: spacing.sm, textAlign: "center" }]}
          >
            We couldn't load your referrals.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setError(false);
              setLoading(true);
              load(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              marginTop: spacing.md,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: spacing.xl }}>
              <Ionicons
                name="checkmark-done-outline"
                size={30}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  bodyStyle,
                  { fontWeight: "700", marginTop: spacing.sm },
                ]}
              >
                {tab === "open" ? "Nothing waiting for you" : "No replies yet"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 11,
  },
});
