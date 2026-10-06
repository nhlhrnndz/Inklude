// app/(app)/guidance/reports.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import PwdBarChart from "../../../components/PwdBarChart";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import {
    AccessibilityReportExport,
    getAccessibilityReportData,
} from "../../../utils/guidanceReportApi";
import { getPwdStats, PwdStats } from "../../../utils/guidanceDashboardApi";
import {
    REPORT_STATUS_LABEL,
    reportStatusColor,
} from "../../../utils/reportApi";
import {
    downloadPwdCsv,
    formatDate,
    formatDuration,
    formatMonthLabel,
    printAccessibilityReport,
    printPwdReport,
    PwdReportKind,
} from "../../../utils/reportPdf";

const PREVIEW_ROWS = 10;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Stat({
  value,
  label,
  tint,
}: {
  value: string | number;
  label: string;
  tint?: string;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 140,
        minWidth: 130,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
      }}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: 26,
          fontWeight: "700",
          color: tint ?? colors.text,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.textSecondary,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
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

function ExportButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={colors.primary}
        style={{ marginRight: 6 }}
      />
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "700",
          color: colors.primary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function GuidanceReportsScreen() {
  const { colors, typography, spacing, radius } = useTheme();

  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<AccessibilityReportExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [includeNames, setIncludeNames] = useState(false);
  const reqRef = useRef(0);

    const { user } = useAuth();
  const [pwd, setPwd] = useState<PwdStats | null>(null);
  const [pwdError, setPwdError] = useState(false);

  useEffect(() => {
    getPwdStats()
      .then(setPwd)
      .catch(() => setPwdError(true));
  }, []);

  const handlePwdExport = (kind: PwdReportKind, format: "pdf" | "csv") => {
    if (!pwd) return;

    if (Platform.OS !== "web") {
      Toast.show({
        type: "info",
        text1: "Open on the web",
        text2: "Exports are available in the web version.",
      });
      return;
    }

    const role = user?.role === "admin" ? "Admin" : "Guidance";
    const ok =
      format === "pdf"
        ? printPwdReport(pwd, kind, user?.name || "Guidance Office", role)
        : downloadPwdCsv(pwd, kind);

    if (!ok) {
      Toast.show({
        type: "error",
        text1: "Couldn't export",
        text2: "Try again in a desktop browser.",
      });
    }
  };

  const isCurrentMonth = month >= currentMonth();

  useEffect(() => {
    const reqId = ++reqRef.current;
    setLoading(true);
    setError(false);

    getAccessibilityReportData(month)
      .then((res) => {
        if (reqId === reqRef.current) setData(res);
      })
      .catch((err: any) => {
        if (reqId !== reqRef.current) return;
        setError(true);
        Toast.show({
          type: "error",
          text1: "Failed to load report",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      })
      .finally(() => {
        if (reqId === reqRef.current) setLoading(false);
      });
  }, [month]);

  const handleExport = () => {
    if (!data) return;

    if (Platform.OS !== "web") {
      Toast.show({
        type: "info",
        text1: "Open on the web",
        text2: "PDF export is available in the web version.",
      });
      return;
    }

    const ok = printAccessibilityReport(data, includeNames);
    if (!ok) {
      Toast.show({
        type: "error",
        text1: "Couldn't open the print dialog",
        text2: "Try again in a desktop browser.",
      });
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

  const panelStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  };

  const renderPreview = () => {
    if (!data) return null;

    const locMax = data.topLocations[0]?.count ?? 0;
    const catMax = data.byCategory[0]?.count ?? 0;
    const diff = data.total - data.previousMonthTotal;

    return (
      <>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}
        >
          <Stat value={data.total} label="Total reports" />
          <Stat value={data.resolved} label="Resolved" tint={colors.success} />
          <Stat
            value={data.inProgress}
            label="In progress"
            tint={colors.primary}
          />
          <Stat value={data.pending} label="Pending" tint={colors.warning} />
          <Stat value={`${data.resolutionRate}%`} label="Resolution rate" />
          <Stat
            value={formatDuration(data.avgResolutionHours)}
            label="Avg. time to resolve"
          />
        </View>

        <Text style={[captionStyle, { marginTop: spacing.sm }]}>
          {data.total === 0 && data.previousMonthTotal === 0
            ? "No reports this month or last month."
            : diff === 0
              ? `Same as the previous month (${data.previousMonthTotal}).`
              : `${diff > 0 ? "Up" : "Down"} ${Math.abs(diff)} from the previous month (${data.previousMonthTotal}).`}
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.md,
            marginTop: spacing.md,
          }}
        >
          <View
            style={[
              panelStyle,
              { flexGrow: 1, flexShrink: 1, flexBasis: 320, minWidth: 260 },
            ]}
          >
            <Text
              style={[
                bodyStyle,
                { fontWeight: "700", marginBottom: spacing.sm },
              ]}
            >
              Most reported locations
            </Text>
            {data.topLocations.length === 0 ? (
              <Text style={[captionStyle, { fontStyle: "italic" }]}>
                No reports this month.
              </Text>
            ) : (
              data.topLocations.map((l) => (
                <BarRow
                  key={l.location}
                  label={l.location}
                  value={l.count}
                  max={locMax}
                  color={colors.primary}
                />
              ))
            )}
          </View>

          <View
            style={[
              panelStyle,
              { flexGrow: 1, flexShrink: 1, flexBasis: 320, minWidth: 260 },
            ]}
          >
            <Text
              style={[
                bodyStyle,
                { fontWeight: "700", marginBottom: spacing.sm },
              ]}
            >
              Issue types
            </Text>
            {data.byCategory.length === 0 ? (
              <Text style={[captionStyle, { fontStyle: "italic" }]}>
                No reports this month.
              </Text>
            ) : (
              data.byCategory.map((c) => (
                <BarRow
                  key={c.category}
                  label={c.category}
                  value={c.count}
                  max={catMax}
                  color={colors.primary}
                />
              ))
            )}
          </View>
        </View>

        <View style={[panelStyle, { marginTop: spacing.md }]}>
          <Text
            style={[bodyStyle, { fontWeight: "700", marginBottom: spacing.sm }]}
          >
            Individual reports ({data.reports.length})
          </Text>

          {data.reports.length === 0 ? (
            <Text style={[captionStyle, { fontStyle: "italic" }]}>
              No accessibility reports were filed this month.
            </Text>
          ) : (
            data.reports.slice(0, PREVIEW_ROWS).map((r) => {
              const color = reportStatusColor(r.status, colors);
              return (
                <View
                  key={r.id}
                  style={{
                    paddingVertical: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={[bodyStyle, { flex: 1, fontWeight: "600" }]}
                      numberOfLines={1}
                    >
                      {r.location} · {r.category}
                    </Text>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: color,
                        borderRadius: radius.round,
                        paddingHorizontal: 9,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color,
                        }}
                      >
                        {REPORT_STATUS_LABEL[r.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={[captionStyle, { marginTop: 2 }]}>
                    {formatDate(r.createdAt)}
                    {includeNames ? ` · ${r.studentName}` : ""}
                  </Text>
                  <Text
                    style={[captionStyle, { marginTop: 2 }]}
                    numberOfLines={2}
                  >
                    {r.description}
                  </Text>
                </View>
              );
            })
          )}

          {data.reports.length > PREVIEW_ROWS && (
            <Text style={[captionStyle, { marginTop: spacing.sm }]}>
              and {data.reports.length - PREVIEW_ROWS} more in the exported PDF
            </Text>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}
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
            Reports
          </Text>
          <Text
            style={[captionStyle, { marginTop: 2, marginBottom: spacing.md }]}
          >
            Preview a report, then export it as a PDF.
          </Text>

          {/* Report type chips (more reports will be added here) */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            {[
              { label: "Accessibility Issues", active: true },
              { label: "Student Support", active: false },
              { label: "Participation & Support", active: false },
              { label: "Classroom Accessibility", active: false },
              { label: "Overall Summary", active: false },
            ].map((chip) => (
              <View
                key={chip.label}
                accessible
                accessibilityState={{
                  selected: chip.active,
                  disabled: !chip.active,
                }}
                accessibilityLabel={`${chip.label}${chip.active ? "" : ", coming soon"}`}
                style={{
                  borderWidth: 1,
                  borderColor: chip.active ? colors.primary : colors.border,
                  backgroundColor: chip.active
                    ? colors.primary
                    : colors.surface,
                  borderRadius: radius.xl,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  opacity: chip.active ? 1 : 0.55,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    fontWeight: "700",
                    color: chip.active ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {chip.label}
                  {chip.active ? "" : " · soon"}
                </Text>
              </View>
            ))}
          </View>

          {/* Controls */}
          <View
            style={[
              panelStyle,
              {
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: spacing.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => setMonth((m) => shiftMonth(m, -1))}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>

              <Text
                style={[
                  bodyStyle,
                  { fontWeight: "700", minWidth: 150, textAlign: "center" },
                ]}
                accessibilityLiveRegion="polite"
              >
                {formatMonthLabel(month)}
              </Text>

              <TouchableOpacity
                onPress={() => setMonth((m) => shiftMonth(m, 1))}
                disabled={isCurrentMonth}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                accessibilityState={{ disabled: isCurrentMonth }}
                hitSlop={8}
                style={{ padding: 6, opacity: isCurrentMonth ? 0.35 : 1 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                flex: 1,
                minWidth: 200,
              }}
            >
              <Switch
                value={includeNames}
                onValueChange={setIncludeNames}
                trackColor={{
                  false: colors.disabled,
                  true: colors.primaryLight,
                }}
                thumbColor={colors.primary}
                accessibilityLabel="Include student names in the report"
              />
              <Text style={[captionStyle, { flex: 1 }]}>
                Include student names (confidential)
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleExport}
              disabled={!data || loading}
              accessibilityRole="button"
              accessibilityLabel="Export report as PDF"
              accessibilityState={{ disabled: !data || loading }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.lg,
                opacity: !data || loading ? 0.5 : 1,
              }}
            >
              <Ionicons
                name="download-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Export PDF
              </Text>
            </TouchableOpacity>
          </View>

          {loading && !data ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 40 }}
              accessibilityLabel="Loading report"
            />
          ) : error && !data ? (
            <Text style={[bodyStyle, { textAlign: "center", marginTop: 32 }]}>
              We couldn't load this report.
            </Text>
          ) : (
            <View style={{ opacity: loading ? 0.5 : 1 }}>
              {renderPreview()}
            </View>
          )}

                    {/* ---------------- PWD statistics export ---------------- */}
          <View style={{ marginTop: spacing.xl }}>
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.body.fontSize + 4,
                fontWeight: "700",
                color: colors.text,
              }}
              accessibilityRole="header"
            >
              PWD Statistics
            </Text>
            <Text
              style={[captionStyle, { marginTop: 2, marginBottom: spacing.md }]}
            >
              Confidential. Exports show counts below 3 as "&lt;3".
            </Text>

            {pwdError ? (
              <Text style={[captionStyle, { fontStyle: "italic" }]}>
                Couldn't load PWD statistics.
              </Text>
            ) : !pwd ? (
              <ActivityIndicator
                color={colors.primary}
                accessibilityLabel="Loading PWD statistics"
              />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: spacing.md,
                }}
              >
                {(
                  [
                    {
                      kind: "college" as PwdReportKind,
                      title: "PWD Students per College",
                      color: colors.primary,
                      data: pwd.byCollege.map((c) => ({
                        label: c.college,
                        value: c.total,
                      })),
                    },
                    {
                      kind: "category" as PwdReportKind,
                      title: "PWD Students per Support Category",
                      color: colors.primaryLight,
                      data: pwd.byCategory.map((c) => ({
                        label: c.need,
                        value: c.count,
                      })),
                    },
                  ] as const
                ).map((p) => (
                  <View
                    key={p.kind}
                    style={[
                      panelStyle,
                      {
                        flexGrow: 1,
                        flexShrink: 1,
                        flexBasis: 320,
                        minWidth: 260,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        bodyStyle,
                        { fontWeight: "700", marginBottom: spacing.sm },
                      ]}
                    >
                      {p.title}
                    </Text>
                    <PwdBarChart data={[...p.data]} color={p.color} />
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: spacing.sm,
                        marginTop: spacing.sm,
                      }}
                    >
                      <ExportButton
                        icon="download-outline"
                        label="Export PDF"
                        onPress={() => handlePwdExport(p.kind, "pdf")}
                      />
                      <ExportButton
                        icon="document-text-outline"
                        label="Export CSV"
                        onPress={() => handlePwdExport(p.kind, "csv")}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
