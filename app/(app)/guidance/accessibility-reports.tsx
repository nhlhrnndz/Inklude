// app/(app)/guidance/accessibility-reports.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../../context/ThemeContext";
import { useLiveRefresh } from "../../../hooks/useLiveRefresh";
import {
    AccessibilityReport,
    formatReportDate,
    getGuidanceReports,
    getReportStats,
    REPORT_STATUS_LABEL,
    reportPhotoSource,
    ReportStats,
    ReportStatus,
    reportStatusColor,
    updateReportStatus,
} from "../../../utils/reportApi";

type Filter = "all" | ReportStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* One report card, with its own response box + action buttons         */
/* ------------------------------------------------------------------ */
function ReportCard({
  report,
  highlighted,
  onUpdate,
  onPhoto,
}: {
  report: AccessibilityReport;
  highlighted: boolean;
  onUpdate: (
    id: number,
    status: ReportStatus,
    response: string,
  ) => Promise<boolean>;
  onPhoto: (url: string) => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [expanded, setExpanded] = useState(highlighted);
  const [response, setResponse] = useState(report.response);
  const [busy, setBusy] = useState<ReportStatus | null>(null);

  const color = reportStatusColor(report.status, colors);
  const photo = reportPhotoSource(report.photoUrl);

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

  const act = async (status: ReportStatus) => {
    if (status === "resolved" && !response.trim()) {
      Toast.show({
        type: "error",
        text1: "Add a short response",
        text2: "The student will see it when you resolve the report.",
      });
      return;
    }
    setBusy(status);
    await onUpdate(report.id, status, response.trim());
    setBusy(null);
  };

  const actionButton = (
    status: ReportStatus,
    text: string,
    filled: boolean,
  ) => (
    <TouchableOpacity
      onPress={() => act(status)}
      disabled={!!busy}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={{
        flex: 1,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: filled ? colors.primary : colors.surface,
        opacity: busy && busy !== status ? 0.5 : 1,
      }}
    >
      {busy === status ? (
        <ActivityIndicator color={filled ? "#FFFFFF" : colors.primary} />
      ) : (
        <Text
          style={{
            fontWeight: "700",
            color: filled ? "#FFFFFF" : colors.primary,
          }}
        >
          {text}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: highlighted ? colors.primary : colors.border,
        borderWidth: highlighted ? 2 : 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${report.category} at ${report.location}, ${
          REPORT_STATUS_LABEL[report.status]
        }. ${expanded ? "Collapse" : "Expand"}`}
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={[bodyStyle, { fontWeight: "700" }]}>
            {report.category}
          </Text>
          <Text style={[captionStyle, { marginTop: 1 }]} numberOfLines={1}>
            {report.location} • {report.studentName} •{" "}
            {formatReportDate(report.createdAt)}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: color + "22",
            borderColor: color,
            borderWidth: 1,
            borderRadius: radius.round,
            paddingHorizontal: 10,
            paddingVertical: 3,
            marginRight: spacing.sm,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text }}>
            {REPORT_STATUS_LABEL[report.status]}
          </Text>
        </View>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={bodyStyle}>{report.description}</Text>

          {!!photo && (
            <TouchableOpacity
              onPress={() => onPhoto(photo)}
              accessibilityRole="button"
              accessibilityLabel="View photo"
              style={{ marginTop: spacing.sm, alignSelf: "flex-start" }}
            >
              <Image
                source={{ uri: photo }}
                style={{
                  width: 140,
                  height: 105,
                  borderRadius: radius.md,
                  backgroundColor: colors.secondaryBackground,
                }}
              />
            </TouchableOpacity>
          )}

          {report.status === "resolved" ? (
            <View
              style={{
                marginTop: spacing.sm,
                backgroundColor: colors.secondaryBackground,
                borderRadius: radius.md,
                padding: spacing.sm + 2,
              }}
            >
              <Text style={[captionStyle, { fontWeight: "700" }]}>
                Response{report.handlerName ? ` by ${report.handlerName}` : ""}
              </Text>
              <Text style={[bodyStyle, { marginTop: 2 }]}>
                {report.response}
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={{
                  marginTop: spacing.sm,
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  minHeight: 70,
                  textAlignVertical: "top",
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                }}
                placeholder="Short response to the student (required to resolve)"
                placeholderTextColor={colors.placeholder}
                value={response}
                onChangeText={setResponse}
                multiline
                maxLength={500}
                accessibilityLabel="Response to the student"
              />

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: spacing.sm,
                }}
              >
                {report.status === "pending" &&
                  actionButton("in_progress", "Start working", false)}
                {actionButton("resolved", "Resolve", true)}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function AccessibilityReportsScreen() {
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { colors, typography, spacing, radius } = useTheme();

  const [month, setMonth] = useState(currentMonthKey());
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [reports, setReports] = useState<AccessibilityReport[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const load = useCallback(
    async (showErrors = false) => {
      try {
        const [s, r] = await Promise.all([
          getReportStats(month),
          getGuidanceReports(),
        ]);
        setStats(s);
        setReports(r.reports ?? []);
      } catch (err: any) {
        if (showErrors) {
          Toast.show({
            type: "error",
            text1: "Failed to load reports",
            text2: err.response?.data?.message ?? "Please try again.",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [month],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useLiveRefresh(() => load(false), {
    sourceType: "accessibility_report",
    intervalMs: 20000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleUpdate = async (
    id: number,
    status: ReportStatus,
    response: string,
  ) => {
    try {
      await updateReportStatus(id, { status, response });
      Toast.show({
        type: "success",
        text1: status === "resolved" ? "Report resolved" : "Marked in progress",
        text2: "The student was notified.",
      });
      await load(false);
      return true;
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not update report",
        text2: err.response?.data?.message ?? "Please try again.",
      });
      return false;
    }
  };

  const visible = useMemo(
    () =>
      filter === "all" ? reports : reports.filter((r) => r.status === filter),
    [reports, filter],
  );

  const isCurrentMonth = month >= currentMonthKey();
  const maxCount = Math.max(
    1,
    ...(stats?.byCategory.map((c) => c.count) ?? []),
  );

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

  const tile = (label: string, value: number, color: string) => (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.secondaryBackground,
        borderRadius: radius.md,
        padding: spacing.sm + 2,
        alignItems: "center",
      }}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={{ fontSize: 22, fontWeight: "700", color }}>{value}</Text>
      <Text style={[captionStyle, { marginTop: 1 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const header = (
    <>
      {/* Monthly summary */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => setMonth((m) => shiftMonth(m, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[bodyStyle, { fontWeight: "700" }]}>
            {monthLabel(month)}
          </Text>

          <TouchableOpacity
            onPress={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrentMonth}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            hitSlop={10}
            style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[captionStyle, { marginTop: spacing.sm }]}>
          {stats?.total ?? 0} report{stats?.total === 1 ? "" : "s"} this month
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.sm }}>
          {tile("Pending", stats?.pending ?? 0, colors.warning)}
          {tile("In Progress", stats?.inProgress ?? 0, colors.primary)}
          {tile("Resolved", stats?.resolved ?? 0, colors.success)}
        </View>

        <Text
          style={[
            bodyStyle,
            { fontWeight: "700", marginTop: spacing.md, marginBottom: 6 },
          ]}
          accessibilityRole="header"
        >
          Most reported areas
        </Text>

        {stats && stats.byCategory.length > 0 ? (
          stats.byCategory.map((c) => (
            <View
              key={c.category}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
              accessibilityLabel={`${c.category}: ${c.count} reports`}
            >
              <Text style={[captionStyle, { width: 118 }]} numberOfLines={1}>
                {c.category}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 14,
                  backgroundColor: colors.secondaryBackground,
                  borderRadius: radius.round,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${(c.count / maxCount) * 100}%`,
                    backgroundColor: colors.primary,
                    borderRadius: radius.round,
                  }}
                />
              </View>
              <Text
                style={[
                  captionStyle,
                  {
                    width: 28,
                    textAlign: "right",
                    fontWeight: "700",
                    color: colors.text,
                  },
                ]}
              >
                {c.count}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[captionStyle, { fontStyle: "italic" }]}>
            No reports in this month.
          </Text>
        )}
      </View>

      {/* Filter chips for the list below */}
      <Text
        style={[bodyStyle, { fontWeight: "700", marginBottom: spacing.sm }]}
        accessibilityRole="header"
      >
        All reports
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: spacing.md,
        }}
      >
        {FILTERS.map((f) => {
          const selected = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${f.label}`}
              style={{
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : colors.surface,
                borderRadius: radius.xl,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: selected ? "#FFFFFF" : colors.text,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
          Accessibility Reports
        </Text>
        <Text style={[captionStyle, { marginTop: 2 }]}>
          Barriers reported by students
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading reports"
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              highlighted={highlight === String(item.id)}
              onUpdate={handleUpdate}
              onPhoto={setViewPhoto}
            />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 40,
          }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text
              style={[
                captionStyle,
                { textAlign: "center", marginTop: spacing.md },
              ]}
            >
              No reports to show.
            </Text>
          }
        />
      )}

      <Modal
        visible={!!viewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewPhoto(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
          }}
        >
          {!!viewPhoto && (
            <Image
              source={{ uri: viewPhoto }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            onPress={() => setViewPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            style={{ position: "absolute", top: 48, right: 20, padding: 8 }}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
