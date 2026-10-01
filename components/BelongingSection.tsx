// components/BelongingSection.tsx
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import {
    getStudentBelonging,
    OutreachMode,
    sendReachOut,
    StudentBelongingResponse,
} from "../utils/belongingApi";
import ReachOutModal, { ReachOutPayload } from "./ReachOutModal";

type Props = {
  studentId: number;
  studentName: string;
};

const MODE_LABELS: Record<OutreachMode, string> = {
  template: "Template",
  edited: "Edited template",
  custom: "Written by hand",
};

export default function BelongingSection({ studentId, studentName }: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  const [data, setData] = useState<StudentBelongingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await getStudentBelonging(studentId);
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleSend = async (payload: ReachOutPayload) => {
    try {
      setSending(true);

      await sendReachOut(studentId, payload);

      Toast.show({
        type: "success",
        text1: "Message sent",
        text2: "The student has been notified.",
      });

      setModalOpen(false);
      await load();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Couldn't send the message",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderTile = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: string,
    sub?: string,
  ) => (
    <View
      key={label}
      style={[
        styles.tile,
        {
          backgroundColor: colors.secondaryBackground,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
      accessibilityLabel={`${label}: ${value}${sub ? `. ${sub}` : ""}`}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />

      <Text
        style={{
          fontFamily: typography.h2.fontFamily,
          fontSize: typography.h2.fontSize,
          fontWeight: "700",
          color: colors.text,
          marginTop: 6,
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "600",
          color: colors.text,
          marginTop: 2,
        }}
      >
        {label}
      </Text>

      {!!sub && (
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize - 1,
            color: colors.textSecondary,
            marginTop: 3,
            lineHeight: typography.caption.fontSize + 4,
          }}
        >
          {sub}
        </Text>
      )}
    </View>
  );

  const renderBody = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginVertical: spacing.lg }}
          accessibilityLabel="Loading belonging information"
        />
      );
    }

    if (error || !data) {
      return (
        <View style={{ alignItems: "center", paddingVertical: spacing.md }}>
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            Couldn't load belonging information.
          </Text>

          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={{ marginTop: spacing.sm }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading belonging information"
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontWeight: "700",
                color: colors.primary,
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const { belonging, outreach } = data;
    const { flag, recentSessions, pulse, checkins, peerShares } = belonging;

    const flagged = flag.flagged;
    const needsHelp = flag.reasons.some((r) => r.key === "needs_help");
    const quiet = flag.reasons.some((r) => r.key === "quiet");

    const flagTitle =
      flag.level === "high"
        ? "Needs a reach-out"
        : flag.level === "watch"
          ? "Worth a check-in"
          : "No concerns flagged";

    return (
      <>
        {/* Flag / reach-out card */}
        <View
          style={[
            styles.flagCard,
            {
              backgroundColor: flagged
                ? colors.warning + "18"
                : colors.secondaryBackground,
              borderColor: flagged ? colors.warning : colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
            },
          ]}
          accessibilityLabel={`Belonging status: ${flagTitle}`}
        >
          <View style={styles.flagHeader}>
            <Ionicons
              name={flagged ? "alert-circle" : "checkmark-circle-outline"}
              size={24}
              color={flagged ? colors.warning : colors.success}
            />

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {flagTitle}
              </Text>

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 2,
                  lineHeight: typography.caption.fontSize + 5,
                }}
              >
                {flagged
                  ? "A few signals suggest this student may be feeling disconnected."
                  : "You can still reach out to any student, flagged or not."}
              </Text>
            </View>
          </View>

          {flagged &&
            flag.reasons.map((reason) => (
              <View key={reason.key} style={styles.reasonRow}>
                <Text style={{ color: colors.warning, marginRight: 8 }}>•</Text>

                <Text
                  style={{
                    flex: 1,
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.text,
                    lineHeight: typography.caption.fontSize + 5,
                  }}
                >
                  {reason.label}
                </Text>
              </View>
            ))}

          <TouchableOpacity
            onPress={() => setModalOpen(true)}
            style={[
              styles.reachOutButton,
              {
                backgroundColor: flagged ? colors.primary : colors.surface,
                borderColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.sm + 4,
                marginTop: spacing.md,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Reach out to ${studentName}`}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={flagged ? "#FFFFFF" : colors.primary}
            />

            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "700",
                color: flagged ? "#FFFFFF" : colors.primary,
                marginLeft: 8,
              }}
            >
              Reach out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Signals */}
        <View style={[styles.tileGrid, { gap: 10, marginTop: spacing.md }]}>
          {renderTile(
            "hand-right-outline",
            "“I'm here” taps",
            `${recentSessions.withPresenceTap}/${recentSessions.attended}`,
            recentSessions.attended === 0
              ? "No finished sessions yet"
              : `sessions with a tap (last ${recentSessions.attended})`,
          )}

          {renderTile(
            "chatbox-outline",
            "Teacher check-ins",
            String(checkins.received),
            `${checkins.replied} replied • last ${belonging.windowDays} days`,
          )}

          {renderTile(
            "happy-outline",
            "Class pulse",
            `${pulse.answered}/${recentSessions.attended}`,
            pulse.answered > 0
              ? `answered • 😞 ${pulse.sad}  😐 ${pulse.okay}  😀 ${pulse.happy}`
              : "No answers yet",
          )}

          {peerShares.enabled &&
            renderTile(
              "people-outline",
              "Peer shares",
              String(peerShares.sent + peerShares.received),
              `${peerShares.sent} sent • ${peerShares.received} received`,
            )}
        </View>

        {/* Outreach history */}
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            fontWeight: "700",
            color: colors.text,
            marginTop: spacing.md,
            marginBottom: 6,
          }}
          accessibilityRole="header"
        >
          Recent outreach
        </Text>

        {outreach.length === 0 ? (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              fontStyle: "italic",
            }}
          >
            No outreach sent yet.
          </Text>
        ) : (
          outreach.map((item) => (
            <View
              key={item.id}
              style={[
                styles.outreachRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.sm + 2,
                  padding: 12,
                  marginBottom: 8,
                },
              ]}
            >
              <View style={styles.outreachTop}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {MODE_LABELS[item.mode]}
                </Text>

                <Text style={{ fontSize: 11, color: colors.placeholder }}>
                  {formatDate(item.sentAt)} • {item.guidanceName}
                </Text>
              </View>

              {!!item.body && (
                <Text
                  numberOfLines={3}
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.text,
                    lineHeight: 18,
                    marginTop: 4,
                  }}
                >
                  {item.body}
                </Text>
              )}
            </View>
          ))
        )}

        <ReachOutModal
          visible={modalOpen}
          studentName={studentName}
          needsHelp={needsHelp}
          quiet={quiet}
          sending={sending}
          onClose={() => setModalOpen(false)}
          onSend={handleSend}
        />
      </>
    );
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={styles.titleRow}>
        <Ionicons name="heart-outline" size={20} color={colors.primary} />

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: colors.text,
            marginLeft: 8,
          }}
          accessibilityRole="header"
        >
          Belonging
        </Text>
      </View>

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize - 1,
          color: colors.textSecondary,
          marginTop: 2,
          marginBottom: spacing.sm + 2,
        }}
      >
        Visible to guidance only — never to teachers or classmates.
      </Text>

      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  flagCard: {
    borderWidth: 1,
  },

  flagHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    paddingLeft: 34,
  },

  reachOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
  },

  outreachRow: {
    borderWidth: 1,
  },

  outreachTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
