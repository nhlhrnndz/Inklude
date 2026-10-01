// app/(app)/belonging.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
    BelongingOverview,
    getBelongingOverview,
} from "../../utils/belongingApi";

type MetricKey = "checkins" | "taps" | "pulse" | "peer";

const CHART_HEIGHT = 120;

export default function BelongingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [data, setData] = useState<BelongingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("checkins");

  const isGuidance = user?.role === "guidance" || user?.role === "admin";

  const load = useCallback(async (force = false) => {
    try {
      setError(false);
      const res = await getBelongingOverview(force);
      setData(res);
    } catch (err: any) {
      setError(true);

      if (force) {
        Toast.show({
          type: "error",
          text1: "Couldn't refresh",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // The drawer keeps screens mounted, so reload every time this one
  // regains focus. Silent when we already have data on screen.
  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  if (!isGuidance) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <Text
          style={{
            margin: spacing.lg,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
          }}
        >
          Only guidance counselors can view this.
        </Text>
      </SafeAreaView>
    );
  }

  const renderTile = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: string,
    sub: string,
    accent?: string,
  ) => (
    <View
      key={label}
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
      accessibilityLabel={`${label}: ${value}. ${sub}`}
    >
      <Ionicons name={icon} size={20} color={accent ?? colors.primary} />

      <Text
        style={{
          fontFamily: typography.h2.fontFamily,
          fontSize: typography.h2.fontSize,
          fontWeight: "700",
          color: colors.text,
          marginTop: 8,
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "700",
          color: colors.text,
          marginTop: 2,
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize - 1,
          color: colors.textSecondary,
          marginTop: 4,
          lineHeight: typography.caption.fontSize + 4,
        }}
      >
        {sub}
      </Text>
    </View>
  );

  const renderTrend = (overview: BelongingOverview) => {
    const metrics: {
      key: MetricKey;
      label: string;
      hint: string;
      max: number;
      values: (number | null)[];
    }[] = [
      {
        key: "checkins",
        label: "Check-ins",
        hint: "Teacher check-ins sent per week",
        max: Math.max(1, ...overview.trend.map((t) => t.checkins)),
        values: overview.trend.map((t) => t.checkins),
      },
      {
        key: "taps",
        label: "“I'm here”",
        hint: "“I'm here” taps per week",
        max: Math.max(1, ...overview.trend.map((t) => t.taps)),
        values: overview.trend.map((t) => t.taps),
      },
      {
        key: "pulse",
        label: "Mood",
        hint: "Average class pulse per week (1 = 😞, 3 = 😀)",
        max: 3,
        values: overview.trend.map((t) => t.pulseAvg),
      },
    ];

    if (overview.peerSharingEnabled) {
      metrics.push({
        key: "peer",
        label: "Peer shares",
        hint: "Peer caption shares per week",
        max: Math.max(1, ...overview.trend.map((t) => t.peerShares)),
        values: overview.trend.map((t) => t.peerShares),
      });
    }

    const active = metrics.find((m) => m.key === metric) ?? metrics[0];

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.md,
            marginTop: spacing.lg,
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
          accessibilityRole="header"
        >
          Trend over the last 8 weeks
        </Text>

        <View style={[styles.chipRow, { gap: 8, marginTop: spacing.sm + 2 }]}>
          {metrics.map((m) => {
            const isActive = m.key === active.key;

            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMetric(m.key)}
                style={{
                  paddingHorizontal: spacing.sm + 6,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive ? colors.primary : colors.surface,
                }}
                accessibilityRole="button"
                accessibilityLabel={`Show ${m.hint}`}
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    fontWeight: "600",
                    color: isActive ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize - 1,
            color: colors.textSecondary,
            marginTop: spacing.sm,
          }}
        >
          {active.hint}
        </Text>

        <View
          style={[styles.chart, { height: CHART_HEIGHT + 34, marginTop: 10 }]}
          accessibilityLabel={`${active.hint}: ${overview.trend
            .map(
              (t, i) =>
                `${t.label} ${active.values[i] === null ? "no data" : active.values[i]}`,
            )
            .join(", ")}`}
        >
          {overview.trend.map((point, index) => {
            const value = active.values[index];
            const barHeight =
              value === null
                ? 0
                : Math.max(
                    value > 0 ? 4 : 0,
                    (value / active.max) * CHART_HEIGHT,
                  );

            return (
              <View key={point.label} style={styles.barColumn}>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: 11,
                    fontWeight: "700",
                    color: value === null ? colors.placeholder : colors.text,
                    marginBottom: 3,
                  }}
                >
                  {value === null ? "–" : value}
                </Text>

                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  <View
                    style={{
                      width: "100%",
                      height: barHeight,
                      backgroundColor: colors.primary,
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                    }}
                  />
                </View>

                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: 10,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {point.label}
                </Text>
              </View>
            );
          })}
        </View>

        {metric === "pulse" && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize - 1,
              color: colors.placeholder,
              marginTop: 6,
            }}
          >
            A dash means fewer than 3 students answered that week, so it's
            hidden to keep answers anonymous.
          </Text>
        )}
      </View>
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading belonging overview"
        />
      );
    }

    if (error && !data) {
      return (
        <View style={{ alignItems: "center", marginTop: 60 }}>
          <Ionicons
            name="cloud-offline-outline"
            size={30}
            color={colors.textSecondary}
          />

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
              marginTop: spacing.sm,
            }}
          >
            We couldn't load the belonging overview.
          </Text>

          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              load(true);
            }}
            style={{
              marginTop: spacing.md,
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading belonging overview"
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!data) return null;

    const { totals, thisWeek, flaggedStudents } = data;
    const pulse = thisWeek.pulse;

    return (
      <>
        <View style={[styles.tileGrid, { gap: 10, marginTop: spacing.md }]}>
          {renderTile(
            "alert-circle-outline",
            "Need attention",
            String(totals.flagged),
            totals.flagged === 0
              ? "No students flagged right now"
              : `${totals.high} high priority • ${totals.watch} to watch`,
            totals.flagged > 0 ? colors.warning : colors.success,
          )}

          {renderTile(
            "chatbox-outline",
            "Check-ins sent",
            String(thisWeek.checkinsSent),
            `${thisWeek.checkinsReplied} replied • last 7 days`,
          )}

          {renderTile(
            "happy-outline",
            "Class pulse",
            pulse.hidden || pulse.average === null ? "—" : `${pulse.average}/3`,
            pulse.hidden || !pulse.counts
              ? "Not enough answers yet (needs 3+)"
              : `😞 ${pulse.counts.sad}  😐 ${pulse.counts.okay}  😀 ${pulse.counts.happy} • last 7 days`,
          )}

          {renderTile(
            "person-outline",
            "No interactions",
            String(totals.zeroInteraction),
            `students with no “I'm here” tap or check-in in ${data.interactionWindowDays} days`,
            totals.zeroInteraction > 0 ? colors.warning : colors.success,
          )}

          {data.peerSharingEnabled &&
            renderTile(
              "people-outline",
              "Peer shares",
              String(thisWeek.peerShares),
              "shared between classmates • last 7 days",
            )}
        </View>

        {renderTrend(data)}

        {/* Students to reach out to */}
        <View style={{ marginTop: spacing.lg }}>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
            accessibilityRole="header"
          >
            Students to reach out to
          </Text>

          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize - 1,
              color: colors.textSecondary,
              marginTop: 2,
              marginBottom: spacing.sm + 2,
            }}
          >
            Tap a student to see why they're flagged and send a message.
          </Text>

          {flaggedStudents.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={28}
                color={colors.success}
              />

              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                  marginTop: spacing.sm,
                }}
              >
                No one is flagged right now
              </Text>

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                You can still reach out to any student from their detail screen.
              </Text>
            </View>
          ) : (
            flaggedStudents.map((student) => {
              const isHigh = student.level === "high";
              const badgeColor = isHigh ? colors.danger : colors.warning;

              return (
                <TouchableOpacity
                  key={student.id}
                  onPress={() =>
                    router.push(`/guidance/student/${student.id}` as any)
                  }
                  activeOpacity={0.8}
                  style={[
                    styles.studentRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isHigh ? badgeColor : colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${student.name}, ${
                    isHigh ? "needs a reach-out" : "worth a check-in"
                  }. ${student.topReason ?? ""}`}
                >
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {student.name}
                    </Text>

                    {(student.course || student.yearLevel) && (
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize - 1,
                          color: colors.placeholder,
                          marginTop: 1,
                        }}
                      >
                        {[student.course, student.yearLevel]
                          .filter(Boolean)
                          .join(" • ")}
                      </Text>
                    )}

                    {!!student.topReason && (
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          color: colors.textSecondary,
                          marginTop: 5,
                          lineHeight: typography.caption.fontSize + 4,
                        }}
                      >
                        {student.topReason}
                        {student.reasonCount > 1
                          ? ` (+${student.reasonCount - 1} more)`
                          : ""}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View
                      style={{
                        backgroundColor: badgeColor + "1A",
                        borderColor: badgeColor,
                        borderWidth: 1,
                        borderRadius: radius.sm,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: badgeColor,
                        }}
                      >
                        {isHigh ? "Reach out" : "Watch"}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {totals.flagged > flaggedStudents.length && (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize - 1,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Showing the top {flaggedStudents.length} of {totals.flagged}{" "}
              flagged students.
            </Text>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 4,
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={colors.primary}
          />
        }
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
          Belonging
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
          How connected students feel across your school. Cohort numbers only —
          individual mood answers are never shown.
        </Text>

        {renderBody()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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

  card: {
    borderWidth: 1,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },

  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  barTrack: {
    width: "70%",
    justifyContent: "flex-end",
  },

  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  emptyCard: {
    alignItems: "center",
    borderWidth: 1,
  },
});
