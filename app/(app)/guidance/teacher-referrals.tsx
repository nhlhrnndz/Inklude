// app/(app)/guidance/teacher-referrals.tsx
// Guidance: review referrals that teachers sent about their students.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { useLiveRefresh } from "../../../hooks/useLiveRefresh";
import {
    getTeacherReferrals,
    TeacherReferral,
    TeacherReferralStatus,
    updateTeacherReferralStatus,
} from "../../../utils/guidanceReferralApi";

type Tab = "active" | "completed" | "all";

const STATUS_LABEL: Record<TeacherReferralStatus, string> = {
  sent: "New",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  completed: "Completed",
};

const NEXT_ACTIONS: Record<
  TeacherReferralStatus,
  {
    status: Exclude<TeacherReferralStatus, "sent">;
    label: string;
    primary?: boolean;
  }[]
> = {
  sent: [
    { status: "acknowledged", label: "Acknowledge" },
    { status: "in_progress", label: "Start follow-up", primary: true },
  ],
  acknowledged: [
    { status: "in_progress", label: "Start follow-up" },
    { status: "completed", label: "Mark completed", primary: true },
  ],
  in_progress: [
    { status: "completed", label: "Mark completed", primary: true },
  ],
  completed: [],
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

export default function TeacherReferralsForGuidance() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [referrals, setReferrals] = useState<TeacherReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  const [panelId, setPanelId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const keyRef = useRef("");

  const load = useCallback(async (showErrors = false) => {
    try {
      const res = await getTeacherReferrals();
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
    sourceType: "teacher_referral",
    intervalMs: 20000,
  });

  const activeList = useMemo(
    () => referrals.filter((r) => r.status !== "completed"),
    [referrals],
  );
  const completedList = useMemo(
    () => referrals.filter((r) => r.status === "completed"),
    [referrals],
  );
  const visible =
    tab === "active"
      ? activeList
      : tab === "completed"
        ? completedList
        : referrals;

  const replaceOne = (updated: TeacherReferral) => {
    setReferrals((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  };

  const handleUpdate = async (
    item: TeacherReferral,
    status: Exclude<TeacherReferralStatus, "sent">,
  ) => {
    setBusyId(item.id);
    try {
      const res = await updateTeacherReferralStatus(
        item.id,
        status,
        noteText.trim() || undefined,
      );
      replaceOne(res.referral);
      setPanelId(null);
      setNoteText("");
      Toast.show({
        type: "success",
        text1: `Marked as ${STATUS_LABEL[status].toLowerCase()}`,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not update referral",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const statusColors = (status: TeacherReferralStatus) => {
    switch (status) {
      case "sent":
        return { bg: colors.warning + "22", border: colors.warning };
      case "acknowledged":
        return { bg: colors.primaryLight + "1A", border: colors.primary };
      case "in_progress":
        return { bg: colors.primary + "22", border: colors.primary };
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

  if (user?.role !== "guidance" && user?.role !== "admin") {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <Text style={[bodyStyle, { textAlign: "center", marginTop: 60 }]}>
          This page is for the Guidance Office.
        </Text>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: TeacherReferral }) => {
    const badge = statusColors(item.status);
    const busy = busyId === item.id;
    const panelOpen = panelId === item.id;
    const actions = NEXT_ACTIONS[item.status];

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
        accessibilityLabel={`Teacher referral for ${item.studentName} in ${item.classTitle}. ${item.concern}. ${STATUS_LABEL[item.status]}.`}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <TouchableOpacity
              onPress={() =>
                router.push(`/guidance/student/${item.studentId}` as any)
              }
              accessibilityRole="link"
              accessibilityLabel={`Open ${item.studentName}'s profile`}
              hitSlop={6}
            >
              <Text
                style={[
                  bodyStyle,
                  {
                    fontWeight: "700",
                    color: colors.primary,
                    textDecorationLine: "underline",
                  },
                ]}
              >
                {item.studentName}
              </Text>
            </TouchableOpacity>
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

        <Text style={[captionStyle, { marginTop: spacing.sm }]}>
          Referred by {item.teacherName || "a teacher"}
          {item.alreadySpoke === null
            ? ""
            : item.alreadySpoke
              ? " • Already spoke with the student"
              : " • Has not spoken with the student yet"}
        </Text>

        {!!item.note && (
          <Text style={[bodyStyle, { marginTop: spacing.sm, lineHeight: 21 }]}>
            {item.note}
          </Text>
        )}

        {!!item.guidanceNote && (
          <View
            style={{
              backgroundColor: colors.secondaryBackground,
              borderRadius: radius.md,
              padding: spacing.sm + 4,
              marginTop: spacing.sm + 2,
            }}
          >
            <Text style={[captionStyle, { fontWeight: "700" }]}>
              Guidance note (private, the teacher cannot see this)
            </Text>
            <Text style={[bodyStyle, { marginTop: 4, lineHeight: 21 }]}>
              {item.guidanceNote}
            </Text>
          </View>
        )}

        {item.status === "completed" && !!item.completedAt && (
          <Text style={[captionStyle, { marginTop: spacing.sm }]}>
            Completed {formatDay(item.completedAt)}
            {item.guidanceName ? ` by ${item.guidanceName}` : ""}
          </Text>
        )}

        {actions.length > 0 && !panelOpen && (
          <TouchableOpacity
            onPress={() => {
              setPanelId(item.id);
              setNoteText("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Update referral status"
            style={[
              styles.actionBtn,
              {
                marginTop: spacing.md,
                borderColor: colors.primary,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text style={{ fontWeight: "700", color: colors.primary }}>
              Update status
            </Text>
          </TouchableOpacity>
        )}

        {panelOpen && (
          <View style={{ marginTop: spacing.md }}>
            <TextInput
              style={{
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                minHeight: 80,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
              }}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Private note for Guidance records (optional)"
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={500}
              textAlignVertical="top"
              accessibilityLabel="Private Guidance note"
            />

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setPanelId(null)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
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

              {actions.map((a) => (
                <TouchableOpacity
                  key={a.status}
                  onPress={() => handleUpdate(item, a.status)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  style={[
                    styles.actionBtn,
                    {
                      flex: 1.4,
                      borderColor: colors.primary,
                      borderRadius: radius.md,
                      backgroundColor: a.primary
                        ? colors.primary
                        : colors.surface,
                      opacity: busy ? 0.5 : 1,
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator
                      color={a.primary ? "#FFFFFF" : colors.primary}
                    />
                  ) : (
                    <Text
                      style={{
                        fontWeight: "700",
                        color: a.primary ? "#FFFFFF" : colors.primary,
                      }}
                    >
                      {a.label}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "active", label: `Active (${activeList.length})` },
    { key: "completed", label: `Completed (${completedList.length})` },
    { key: "all", label: `All (${referrals.length})` },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 900,
          alignSelf: "center",
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
          Teacher Referrals
        </Text>

        <Text style={[captionStyle, { marginTop: 4, lineHeight: 18 }]}>
          Students that teachers asked Guidance to check in on. Teachers only
          see the status of their referral, never your private notes.
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: spacing.md,
          }}
        >
          {tabs.map((t) => {
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
            We couldn't load the referrals.
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
            width: "100%",
            maxWidth: 900,
            alignSelf: "center",
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
                {tab === "completed"
                  ? "No completed referrals yet"
                  : "No teacher referrals waiting"}
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
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
