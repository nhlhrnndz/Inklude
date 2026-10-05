// app/(app)/guidance-dashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ReactNode, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import {
  getGuidanceDashboardData,
  GuidanceDashboardData,
} from "../../utils/guidanceDashboardApi";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatShortDay(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatClock(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Panels sit side by side on wide screens and stack on narrow ones.
const panelFlex: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 340,
  minWidth: 280,
};

/* ------------------------------------------------------------------ */
/* building blocks                                                     */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  icon,
  actionLabel,
  onAction,
  style,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.md,
            backgroundColor: colors.primaryLight + "18",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>

        <Text
          style={{
            flex: 1,
            marginLeft: spacing.sm,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          {title}
        </Text>

        {!!actionLabel && !!onAction && (
          <TouchableOpacity
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                fontWeight: "700",
                color: colors.primary,
              }}
            >
              {actionLabel}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ marginTop: spacing.md }}>{children}</View>
    </View>
  );
}

function KpiCard({
  icon,
  value,
  label,
  hint,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  hint?: string;
  tint: string;
  onPress: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}${hint ? `, ${hint}` : ""}`}
      style={{
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 170,
        minWidth: 150,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: tint + "22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={20} color={tint} />
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textSecondary}
        />
      </View>

      <Text
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: 30,
          fontWeight: "700",
          color: colors.text,
          marginTop: spacing.sm,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          fontWeight: "600",
          color: colors.text,
        }}
      >
        {label}
      </Text>
      {!!hint && (
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {hint}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function AttentionRow({
  color,
  count,
  label,
  onPress,
}: {
  color: string;
  count: number;
  label: string;
  onPress: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const active = count > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          minWidth: 36,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: radius.md,
          backgroundColor: active ? color + "22" : colors.secondaryBackground,
          borderWidth: 1,
          borderColor: active ? color : colors.border,
          alignItems: "center",
          marginRight: spacing.sm + 2,
        }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: active ? colors.text : colors.textSecondary,
          }}
        >
          {count}
        </Text>
      </View>

      <Text
        style={{
          flex: 1,
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          color: active ? colors.text : colors.textSecondary,
        }}
      >
        {label}
      </Text>

      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const { colors, typography, radius } = useTheme();
  const pct =
    max > 0 && value > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

  return (
    <View
      style={{ marginBottom: 10 }}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            paddingRight: 8,
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.text,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {value}
        </Text>
      </View>
      <View
        style={{
          height: 9,
          width: "100%",
          overflow: "hidden",
          borderRadius: radius.round,
          backgroundColor: colors.secondaryBackground,
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: color,
            borderRadius: radius.round,
          }}
        />
      </View>
    </View>
  );
}

function SubHeading({ text }: { text: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={{
        fontFamily: typography.caption.fontFamily,
        fontSize: typography.caption.fontSize,
        fontWeight: "700",
        color: colors.textSecondary,
        marginBottom: 8,
        letterSpacing: 0.5,
      }}
    >
      {text.toUpperCase()}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* screen                                                              */
/* ------------------------------------------------------------------ */

export default function GuidanceDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [data, setData] = useState<GuidanceDashboardData | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dataKeyRef = useRef("");

  const scrollRef = useRef<ScrollView>(null);
  const attentionYRef = useRef(0);

  const load = useCallback(async (showErrors = false) => {
    try {
      const res = await getGuidanceDashboardData();
      const key = JSON.stringify(res);

      // Only re-render when something actually changed
      if (key !== dataKeyRef.current) {
        dataKeyRef.current = key;
        setData(res);
      }
      setError(false);
    } catch (err: any) {
      if (dataKeyRef.current === "") setError(true);
      if (showErrors) {
        Toast.show({
          type: "error",
          text1: "Failed to load dashboard",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    }
  }, []);

  // Refreshes on focus, when an appointment notification arrives over the
  // socket, and every 20s while the screen is open.
  useLiveRefresh(() => load(false), {
    sourceType: "appointment",
    intervalMs: 20000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const go = (path: string) => router.push(path as any);

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

  const emptyText = (text: string) => (
    <Text style={[captionStyle, { fontStyle: "italic" }]}>{text}</Text>
  );

  /* ------------------------------ body ------------------------------ */

  const renderBody = () => {
    if (!data) return null;

    const {
      supportStatus,
      needsAttention,
      accessibility,
      activity,
      today,
      followups,
      appointments,
      messages,
    } = data;

    const statusSegments = [
      {
        key: "followUp",
        label: "Follow-up needed",
        value: supportStatus.followUp,
        color: colors.danger,
      },
      {
        key: "appointmentPending",
        label: "Appointment pending",
        value: supportStatus.appointmentPending,
        color: colors.warning,
      },
      {
        key: "awaitingReply",
        label: "Awaiting your reply",
        value: supportStatus.awaitingReply,
        color: colors.primary,
      },
      {
        key: "noOpenItems",
        label: "No open items",
        value: supportStatus.noOpenItems,
        color: colors.success,
      },
    ];

    const locationMax = accessibility.topLocations[0]?.count ?? 0;
    const categoryMax = accessibility.topCategories[0]?.count ?? 0;
    const weekMax = Math.max(1, ...activity.weeks.map((w) => w.total));
    const weeksTotal = activity.weeks.reduce((sum, w) => sum + w.total, 0);
    const BAR_AREA = 110;

    return (
      <>
        {/* ---------------- KPI cards ---------------- */}
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}
        >
          <KpiCard
            icon="people-outline"
            value={data.totalStudents}
            label="Students"
            hint="Open student directory"
            tint={colors.primary}
            onPress={() => go("/guidance/students")}
          />
          <KpiCard
            icon="calendar-outline"
            value={appointments.upcomingCount}
            label="Upcoming appointments"
            hint={
              appointments.pendingCount > 0
                ? `${appointments.pendingCount} pending request${
                    appointments.pendingCount === 1 ? "" : "s"
                  }`
                : "No pending requests"
            }
            tint={colors.primary}
            onPress={() => go("/guidance/appointments")}
          />
          <KpiCard
            icon="chatbubble-ellipses-outline"
            value={messages.unreadTotal}
            label="Unread messages"
            hint="Open inbox"
            tint={colors.primary}
            onPress={() => go("/guidance/messages")}
          />
          <KpiCard
            icon="flag-outline"
            value={followups.activeCount}
            label="Active follow-ups"
            hint="See who needs follow-up"
            tint={colors.danger}
            onPress={() =>
              scrollRef.current?.scrollTo({
                y: Math.max(0, attentionYRef.current - 8),
                animated: true,
              })
            }
          />
        </View>

        {/* ------------- Needs attention + Student support ------------- */}
        <View
          onLayout={(e) => {
            attentionYRef.current = e.nativeEvent.layout.y;
          }}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.md,
            marginTop: spacing.md,
          }}
        >
          <Panel
            title="Needs Attention"
            icon="alert-circle-outline"
            style={panelFlex}
          >
            <AttentionRow
              color={colors.danger}
              count={needsAttention.followups}
              label="Follow-ups needed"
              onPress={() =>
                followups.items[0]
                  ? go(`/guidance/student/${followups.items[0].studentId}`)
                  : go("/guidance/students")
              }
            />
            <AttentionRow
              color={colors.warning}
              count={needsAttention.pendingAppointments}
              label="Pending appointment requests"
              onPress={() => go("/guidance/appointments")}
            />
            <AttentionRow
              color={colors.warning}
              count={needsAttention.unansweredMessages}
              label="Messages waiting for a reply"
              onPress={() => go("/guidance/messages")}
            />
            <AttentionRow
              color={colors.warning}
              count={needsAttention.pendingReports}
              label="Pending accessibility reports"
              onPress={() => go("/guidance/accessibility-reports")}
            />
            <AttentionRow
              color={colors.primary}
              count={needsAttention.appointmentsToday}
              label="Appointments today"
              onPress={() => go("/guidance/appointments")}
            />
            <AttentionRow
              color={colors.danger}
              count={needsAttention.needsHelp}
              label="Students who asked for help"
              onPress={() =>
                data.needsHelpStudents[0]
                  ? go(`/guidance/student/${data.needsHelpStudents[0].id}`)
                  : go("/guidance/students")
              }
            />

            {data.needsHelpStudents.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <SubHeading text="Asked for help" />
                {data.needsHelpStudents.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => go(`/guidance/student/${s.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.name} asked for help. Open profile.`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: radius.round,
                        backgroundColor: colors.danger,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: spacing.sm,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                        {s.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[bodyStyle, { fontWeight: "600" }]}
                        numberOfLines={1}
                      >
                        {s.name}
                      </Text>
                      <Text style={captionStyle} numberOfLines={1}>
                        Replied "I need help"
                        {s.latestAt ? ` • ${formatShortDay(s.latestAt)}` : ""}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {followups.items.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <SubHeading text="Students needing follow-up" />
                {followups.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => go(`/guidance/student/${item.studentId}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.studentName}, ${item.reason}. Open profile.`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: radius.round,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: spacing.sm,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                        {item.studentName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[bodyStyle, { fontWeight: "600" }]}
                        numberOfLines={1}
                      >
                        {item.studentName}
                      </Text>
                      <Text style={captionStyle} numberOfLines={1}>
                        {item.reason} • since {formatShortDay(item.createdAt)}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
                {followups.activeCount > followups.items.length && (
                  <Text style={[captionStyle, { marginTop: 4 }]}>
                    and {followups.activeCount - followups.items.length} more
                  </Text>
                )}
              </View>
            )}
          </Panel>

          <Panel
            title="Student Support"
            icon="pie-chart-outline"
            actionLabel="View students"
            onAction={() => go("/guidance/students")}
            style={panelFlex}
          >
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
            >
              <Text
                style={{
                  fontFamily: typography.title.fontFamily,
                  fontSize: 34,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {supportStatus.total}
              </Text>
              <Text style={captionStyle}>students in total</Text>
            </View>

            {/* stacked bar */}
            <View
              style={{
                flexDirection: "row",
                height: 16,
                marginTop: spacing.sm,
                borderRadius: radius.round,
                overflow: "hidden",
                backgroundColor: colors.secondaryBackground,
              }}
              accessibilityLabel={statusSegments
                .map((s) => `${s.label}: ${s.value}`)
                .join(", ")}
            >
              {statusSegments
                .filter((s) => s.value > 0)
                .map((s) => (
                  <View
                    key={s.key}
                    style={{ flex: s.value, backgroundColor: s.color }}
                  />
                ))}
            </View>

            {/* legend */}
            <View style={{ marginTop: spacing.md }}>
              {statusSegments.map((s) => (
                <View
                  key={s.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 6,
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: s.color,
                      marginRight: spacing.sm,
                    }}
                  />
                  <Text style={[bodyStyle, { flex: 1 }]}>{s.label}</Text>
                  <Text style={[bodyStyle, { fontWeight: "700" }]}>
                    {s.value}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[captionStyle, { marginTop: spacing.sm }]}>
              Each student is counted once, by the most urgent item.
            </Text>
          </Panel>
        </View>

        {/* ---------------- Accessibility activity ---------------- */}
        <Panel
          title={`Accessibility Activity · ${formatMonth(accessibility.month)}`}
          icon="accessibility-outline"
          actionLabel="Manage reports"
          onAction={() => go("/guidance/accessibility-reports")}
          style={{ marginTop: spacing.md }}
        >
          {accessibility.total === 0 ? (
            emptyText("No accessibility reports this month yet.")
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.lg,
              }}
            >
              <View style={panelFlex}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.title.fontFamily,
                      fontSize: 34,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {accessibility.total}
                  </Text>
                  <Text style={captionStyle}>reports this month</Text>
                </View>

                <View style={{ marginTop: spacing.sm }}>
                  <BarRow
                    label="Resolved"
                    value={accessibility.resolved}
                    max={accessibility.total}
                    color={colors.success}
                  />
                  <BarRow
                    label="In progress"
                    value={accessibility.inProgress}
                    max={accessibility.total}
                    color={colors.primary}
                  />
                  <BarRow
                    label="Pending"
                    value={accessibility.pending}
                    max={accessibility.total}
                    color={colors.warning}
                  />
                </View>
              </View>

              <View style={panelFlex}>
                <SubHeading text="Most reported locations" />
                {accessibility.topLocations.map((l) => (
                  <BarRow
                    key={l.location}
                    label={l.location}
                    value={l.count}
                    max={locationMax}
                    color={colors.primary}
                  />
                ))}
              </View>

              <View style={panelFlex}>
                <SubHeading text="Top issue types" />
                {accessibility.topCategories.map((c) => (
                  <BarRow
                    key={c.category}
                    label={c.category}
                    value={c.count}
                    max={categoryMax}
                    color={colors.primary}
                  />
                ))}
              </View>
            </View>
          )}
        </Panel>

        {/* ---------------- Support activity + Today ---------------- */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.md,
            marginTop: spacing.md,
          }}
        >
          <Panel
            title="Support Activity"
            icon="stats-chart-outline"
            style={panelFlex}
          >
            <Text style={[captionStyle, { marginBottom: spacing.sm }]}>
              Appointment requests, student messages and accessibility reports
              per week (last 4 weeks)
            </Text>

            {weeksTotal === 0 ? (
              emptyText("No activity in the last 4 weeks.")
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: spacing.sm,
                }}
              >
                {activity.weeks.map((w, i) => {
                  const h =
                    w.total > 0
                      ? Math.max(6, (w.total / weekMax) * BAR_AREA)
                      : 3;
                  const isCurrent = i === activity.weeks.length - 1;
                  return (
                    <View
                      key={w.start}
                      style={{ flex: 1, alignItems: "center" }}
                      accessible
                      accessibilityLabel={`Week of ${formatShortDay(w.start)}: ${w.total} items. ${w.appointments} appointment requests, ${w.messages} messages, ${w.reports} reports.`}
                    >
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          fontWeight: "700",
                          color: colors.text,
                          marginBottom: 4,
                        }}
                      >
                        {w.total}
                      </Text>
                      <View
                        style={{ height: BAR_AREA, justifyContent: "flex-end" }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: h,
                            borderTopLeftRadius: radius.sm,
                            borderTopRightRadius: radius.sm,
                            backgroundColor: isCurrent
                              ? colors.primary
                              : colors.primaryLight,
                          }}
                        />
                      </View>
                      <Text
                        style={[captionStyle, { marginTop: 6, fontSize: 11 }]}
                      >
                        {formatShortDay(w.start)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Panel>

          <Panel
            title="Today"
            icon="today-outline"
            actionLabel="Appointments"
            onAction={() => go("/guidance/appointments")}
            style={panelFlex}
          >
            {today.length === 0 ? (
              <View>
                {emptyText("No appointments scheduled for today.")}
                {appointments.next && (
                  <View style={{ marginTop: spacing.md }}>
                    <SubHeading text="Next appointment" />
                    <Text style={[bodyStyle, { fontWeight: "600" }]}>
                      {appointments.next.studentName} •{" "}
                      {appointments.next.reason}
                    </Text>
                    <Text style={captionStyle}>
                      {formatShortDay(appointments.next.date)} ·{" "}
                      {formatClock(appointments.next.time)}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              today.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => go(`/guidance/student/${a.studentId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatClock(a.time)}, ${a.studentName}, ${a.reason}. Open profile.`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={[
                      bodyStyle,
                      { fontWeight: "700", width: 78, color: colors.primary },
                    ]}
                  >
                    {formatClock(a.time)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[bodyStyle, { fontWeight: "600" }]}
                      numberOfLines={1}
                    >
                      {a.studentName}
                    </Text>
                    <Text style={captionStyle} numberOfLines={1}>
                      {a.reason}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))
            )}
          </Panel>
        </View>
      </>
    );
  };

  /* ------------------------------ render ----------------------------- */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {!data && !error ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading dashboard"
        />
      ) : !data && error ? (
        <View style={{ alignItems: "center", padding: spacing.lg }}>
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.textSecondary}
          />
          <Text
            style={[bodyStyle, { marginTop: spacing.sm, textAlign: "center" }]}
          >
            We couldn't load the dashboard.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setError(false);
              load(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading dashboard"
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
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: 48,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: "100%", maxWidth: 1100, alignSelf: "center" }}>
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "700",
                color: colors.text,
              }}
              accessibilityRole="header"
            >
              Student Support Overview
            </Text>
            <Text
              style={[captionStyle, { marginTop: 2, marginBottom: spacing.md }]}
            >
              {greeting()}, {user?.name || "Guidance Office"}
            </Text>

            {renderBody()}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
