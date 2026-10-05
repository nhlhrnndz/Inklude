// app/(app)/student.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import WhatsActiveBanner from "../../components/WhatsActiveBanner";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useWantsLiveCaptions } from "../../hooks/useWantsLiveCaptions";
import { ScheduleItem, getTodaySchedule } from "../../utils/scheduleApi";

type CardKey =
  | "myClasses"
  | "joinClass"
  | "quickTalk"
  | "tts"
  | "calendar"
  | "guidance"
  | "reportIssue"
  | "events"
  | "accessibilityMap";

interface DashboardCard {
  key: CardKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string;
}

const CARD_DEFS: Record<CardKey, DashboardCard> = {
  myClasses: {
    key: "myClasses",
    icon: "albums-outline",
    title: "My Classes",
    description: "Open your classes, request support and check in",
    route: "/my-classes",
  },
  joinClass: {
    key: "joinClass",
    icon: "enter-outline",
    title: "Join Class",
    description: "Enter the class code from your teacher",
    route: "/join",
  },
  quickTalk: {
    key: "quickTalk",
    icon: "chatbubbles-outline",
    title: "Quick Talk",
    description: "Follow a nearby conversation and reply out loud",
    route: "/quick-talk",
  },
  tts: {
    key: "tts",
    icon: "volume-high-outline",
    title: "Text to Speech",
    description: "Speak using typed messages",
    route: "/tts",
  },
  calendar: {
    key: "calendar",
    icon: "calendar-outline",
    title: "My Calendar",
    description: "See your classes, exams and what is next",
    route: "/schedule",
  },
  guidance: {
    key: "guidance",
    icon: "heart-outline",
    title: "Guidance",
    description: "Message the Guidance Office or book an appointment",
    route: "/guidance-hub",
  },
  reportIssue: {
    key: "reportIssue",
    icon: "alert-circle-outline",
    title: "Report an Issue",
    description: "Tell Guidance about an accessibility barrier on campus",
    route: "/report-issue",
  },
  events: {
    key: "events",
    icon: "calendar-number-outline",
    title: "Campus Events",
    description: "See upcoming events and how accessible they are",
    route: "/events",
  },
  accessibilityMap: {
    key: "accessibilityMap",
    icon: "map-outline",
    title: "Accessibility Map",
    description: "Find ramps, PWD restrooms and elevators on campus",
    route: "/accessibility-map",
  },
};

const TYPE_LABEL: Record<string, string> = {
  exam: "Exam",
  assignment: "Due",
  appointment: "Guidance",
  event: "Event",
  reminder: "Reminder",
};

const WIDGET_MAX_ITEMS = 4;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius, a11y } = useTheme();
  const { needs, preferences, displayUsername } = useAccessibility();

  const [showMore, setShowMore] = useState(false);
  const [today, setToday] = useState<ScheduleItem[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);

  const loadToday = useCallback(async () => {
    try {
      const res = await getTodaySchedule();
      setToday(res.items || []);
    } catch {
      setToday([]);
    } finally {
      setLoadingToday(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [loadToday]),
  );

  const needsHearing =
    needs.includes("Deaf") || needs.includes("Hard of Hearing");
  const nonVerbal = needs.includes("Non-Verbal");
  const wantsCaptions = useWantsLiveCaptions();
  const wantsTTS = !!preferences.text_to_speech || nonVerbal;

  const available: CardKey[] = ["myClasses", "joinClass"];
  if (wantsCaptions || nonVerbal || wantsTTS) available.push("quickTalk");
  if (wantsTTS) available.push("tts");
  available.push(
    "calendar",
    "events",
    "accessibilityMap",
    "guidance",
    "reportIssue",
  );

  const pickedKeys: CardKey[] = [];
  if (wantsCaptions || nonVerbal) pickedKeys.push("quickTalk");
  if (wantsTTS && !(needsHearing && nonVerbal)) pickedKeys.push("tts");

  const recommendedKeys: CardKey[] = [
    "myClasses",
    ...pickedKeys
      .filter((k, i) => pickedKeys.indexOf(k) === i && available.includes(k))
      .slice(0, 2),
  ];

  const recommended = recommendedKeys.map((k) => CARD_DEFS[k]);
  const recommendedSet = new Set(recommended.map((c) => c.key));
  const moreTools = available
    .filter((k) => !recommendedSet.has(k))
    .map((k) => CARD_DEFS[k]);

  const firstName = (user?.name || "").trim().split(" ")[0];
  const greetingName = displayUsername || firstName || "Student";

  const cardMinHeight = a11y.largerButtons ? 96 : 72;

  const renderCard = (card: DashboardCard, highlighted = false) => (
    <TouchableOpacity
      key={card.key}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: highlighted ? colors.primary : colors.border,
          borderWidth: highlighted ? 2 : 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          minHeight: cardMinHeight,
        },
      ]}
      onPress={() => router.push(card.route as any)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${card.description}`}
    >
      <Ionicons
        name={card.icon}
        size={a11y.largerButtons ? 34 : 28}
        color={colors.primary}
        style={{ marginRight: spacing.md }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {card.title}
        </Text>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {card.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const sectionTitle = (text: string) => (
    <Text
      style={{
        fontFamily: typography.title.fontFamily,
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: spacing.sm,
      }}
      accessibilityRole="header"
    >
      {text}
    </Text>
  );

  // Today's schedule widget: shows the day right here, no navigation.
  const renderTodayWidget = () => {
    const nowMs = Date.now();
    const shown = today.slice(0, WIDGET_MAX_ITEMS);
    const extra = today.length - shown.length;

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.xl,
        }}
      >
        {loadingToday ? (
          <ActivityIndicator color={colors.primary} />
        ) : today.length === 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="checkmark-circle-outline"
              size={26}
              color={colors.textSecondary}
              style={{ marginRight: spacing.sm }}
            />
            <Text
              style={{
                flex: 1,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.textSecondary,
              }}
            >
              Nothing on your schedule today.
            </Text>
          </View>
        ) : (
          <>
            {shown.map((item, i) => {
              const start = new Date(item.startTime).getTime();
              const end = new Date(item.endTime).getTime();
              const isNow = start <= nowMs && nowMs < end;
              const isPast = end <= nowMs;
              const single =
                item.type === "assignment" || item.type === "reminder";
              const time =
                item.type === "assignment"
                  ? `Due ${fmtTime(item.startTime)}`
                  : single
                    ? fmtTime(item.startTime)
                    : `${fmtTime(item.startTime)} – ${fmtTime(item.endTime)}`;
              const tag = TYPE_LABEL[item.type];

              return (
                <View
                  key={item.id}
                  accessible
                  accessibilityLabel={`${time}, ${item.title}${isNow ? ", happening now" : ""}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: spacing.sm,
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: colors.divider,
                    opacity: isPast ? 0.55 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 4,
                      alignSelf: "stretch",
                      borderRadius: 2,
                      marginRight: spacing.sm + 2,
                      backgroundColor: isNow ? colors.success : colors.primary,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        fontWeight: "700",
                        color: colors.primary,
                      }}
                    >
                      {time}
                      {isNow ? "  ·  Now" : ""}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        fontWeight: "700",
                        color: colors.text,
                        marginTop: 1,
                      }}
                    >
                      {item.title}
                    </Text>
                    {item.location ? (
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          color: colors.textSecondary,
                        }}
                      >
                        {item.location}
                      </Text>
                    ) : null}
                  </View>
                  {tag ? (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color:
                          item.type === "exam" ? colors.error : colors.primary,
                      }}
                    >
                      {tag}
                    </Text>
                  ) : null}
                </View>
              );
            })}
            {extra > 0 && (
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: spacing.xs,
                }}
              >
                +{extra} more today
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          {getGreeting()}, {greetingName}
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            marginTop: 4,
            marginBottom: spacing.lg,
          }}
        >
          Here is what you can do today.
        </Text>

        <WhatsActiveBanner />

        {sectionTitle("Today")}
        {renderTodayWidget()}

        {recommended.length > 0 && (
          <>
            {sectionTitle("Recommended for you")}
            <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              {recommended.map((c) => renderCard(c, true))}
            </View>
          </>
        )}

        {moreTools.length > 0 && (
          <>
            {sectionTitle("More tools")}
            {a11y.reducedClutter && !showMore ? (
              <TouchableOpacity
                onPress={() => setShowMore(true)}
                accessibilityRole="button"
                accessibilityLabel="Show more tools"
                style={[
                  styles.card,
                  {
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    minHeight: cardMinHeight,
                    marginBottom: spacing.xl,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text
                  style={{
                    flex: 1,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    fontWeight: "600",
                    color: colors.primary,
                  }}
                >
                  Show more tools ({moreTools.length})
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ) : (
              <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
                {moreTools.map((c) => renderCard(c))}
              </View>
            )}
          </>
        )}

        {!a11y.reducedClutter && (
          <>
            {sectionTitle("Upcoming")}
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                padding: spacing.md,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.textSecondary,
                }}
              >
                Assignments, Guidance appointments and campus events will show
                up here soon.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 48 },
  card: { flexDirection: "row", alignItems: "center" },
});
