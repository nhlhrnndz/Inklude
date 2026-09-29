// app/(app)/schedule.tsx
//
// Visual Schedule — the student's day as large, predictable cards.
// Shows what's happening now, what's next (with a countdown), and lets
// the student add their own classes (optionally repeating weekly).

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
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
import { getMySessions } from "../../utils/api";
import { crossAlert } from "../../utils/crossAlert";
import {
    ScheduleItem,
    createScheduleItem,
    deleteScheduleItem,
    getTodaySchedule,
    getWeekSchedule,
} from "../../utils/scheduleApi";

interface JoinedSession {
  id: number;
  title: string;
  status: string;
  isLive: boolean;
}

type ViewMode = "today" | "week";

// ---------- helpers ----------

const pad = (n: number) => String(n).padStart(2, "0");

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDay(d: Date) {
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtCountdown(ms: number) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  if (totalMin < 1) return "less than a minute";
  if (totalMin < 60) return `${totalMin} minute${totalMin === 1 ? "" : "s"}`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

// Accepts "8:30 AM", "8:30am", "14:00", "9 pm"
function parseTime(input: string): { h: number; m: number } | null {
  const s = input.trim().toLowerCase().replace(/\./g, "");
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (m > 59) return null;

  if (meridiem) {
    if (h < 1 || h > 12) return null;
    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }

  return { h, m };
}

function toLocalString(day: Date, h: number, m: number) {
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(
    day.getDate(),
  )} ${pad(h)}:${pad(m)}:00`;
}

function buildDayOptions() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const label =
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString([], { weekday: "short", day: "numeric" });
    return { label, date: d };
  });
}

const REPEAT_OPTIONS = [
  { label: "Just once", weeks: 1 },
  { label: "Weekly · 4 wks", weeks: 4 },
  { label: "Weekly · 8 wks", weeks: 8 },
  { label: "Weekly · 12 wks", weeks: 12 },
];

function findLiveSession(item: ScheduleItem, sessions: JoinedSession[]) {
  const keys = [norm(item.subject), norm(item.title)].filter(Boolean);
  return sessions.find(
    (s) => s.isLive && s.status === "active" && keys.includes(norm(s.title)),
  );
}

// ---------- add form ----------

function AddItemForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  const dayOptions = buildDayOptions();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [location, setLocation] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
    minHeight: 48,
  } as const;

  const labelStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs,
  };

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        minHeight: 44,
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.secondaryBackground,
      }}
    >
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "600",
          color: selected ? "#FFFFFF" : colors.text,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const handleSave = async () => {
    if (!title.trim()) {
      Toast.show({ type: "error", text1: "Add a class name first." });
      return;
    }

    const start = parseTime(startText);
    const end = parseTime(endText);
    if (!start || !end) {
      Toast.show({
        type: "error",
        text1: "Check the times",
        text2: 'Use a format like "8:30 AM" or "14:00".',
      });
      return;
    }
    if (end.h * 60 + end.m <= start.h * 60 + start.m) {
      Toast.show({
        type: "error",
        text1: "End time must be after the start time.",
      });
      return;
    }

    const day = dayOptions[dayIndex].date;

    setSaving(true);
    try {
      await createScheduleItem({
        title: title.trim(),
        subject: subject.trim() || undefined,
        teacherName: teacherName.trim() || undefined,
        location: location.trim() || undefined,
        startTime: toLocalString(day, start.h, start.m),
        endTime: toLocalString(day, end.h, end.m),
        repeatWeeks,
      });
      Toast.show({ type: "success", text1: "Added to your schedule" });
      onSaved();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Could not save",
        text2: error.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}
    >
      <Text
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: typography.title.fontSize,
          fontWeight: "700",
          color: colors.text,
          marginBottom: spacing.sm,
        }}
        accessibilityRole="header"
      >
        Add a class
      </Text>

      <Text style={labelStyle}>Class name *</Text>
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Math"
        placeholderTextColor={colors.placeholder}
        maxLength={150}
        accessibilityLabel="Class name"
      />

      <Text style={labelStyle}>Subject (optional)</Text>
      <TextInput
        style={inputStyle}
        value={subject}
        onChangeText={setSubject}
        placeholder="Same as the classroom name to get a Join button"
        placeholderTextColor={colors.placeholder}
        maxLength={100}
        accessibilityLabel="Subject"
      />

      <Text style={labelStyle}>Teacher (optional)</Text>
      <TextInput
        style={inputStyle}
        value={teacherName}
        onChangeText={setTeacherName}
        placeholder="e.g. Ms. Cruz"
        placeholderTextColor={colors.placeholder}
        maxLength={100}
        accessibilityLabel="Teacher name"
      />

      <Text style={labelStyle}>Room (optional)</Text>
      <TextInput
        style={inputStyle}
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Room 204"
        placeholderTextColor={colors.placeholder}
        maxLength={100}
        accessibilityLabel="Room"
      />

      <Text style={labelStyle}>Day</Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: spacing.sm,
        }}
      >
        {dayOptions.map((opt, i) =>
          chip(opt.label, i === dayIndex, () => setDayIndex(i)),
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Starts *</Text>
          <TextInput
            style={inputStyle}
            value={startText}
            onChangeText={setStartText}
            placeholder="8:30 AM"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            accessibilityLabel="Start time"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Ends *</Text>
          <TextInput
            style={inputStyle}
            value={endText}
            onChangeText={setEndText}
            placeholder="9:30 AM"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            accessibilityLabel="End time"
          />
        </View>
      </View>

      <Text style={labelStyle}>Repeat</Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: spacing.md,
        }}
      >
        {REPEAT_OPTIONS.map((opt) =>
          chip(opt.label, repeatWeeks === opt.weeks, () =>
            setRepeatWeeks(opt.weeks),
          ),
        )}
      </View>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save class"
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          paddingVertical: 14,
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: typography.button.fontFamily,
              fontSize: typography.button.fontSize,
              fontWeight: "700",
            }}
          >
            Save class
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        style={{ alignItems: "center", paddingVertical: spacing.md }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------- screen ----------

export default function ScheduleScreen() {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { colors, typography, spacing, radius } = useTheme();

  const highlightId = highlight ? Number(highlight) : null;

  const [view, setView] = useState<ViewMode>("today");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [sessions, setSessions] = useState<JoinedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  // Keep "starts in X minutes" fresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const [sched, sess] = await Promise.all([
        view === "today" ? getTodaySchedule() : getWeekSchedule(),
        getMySessions().catch(() => ({ sessions: [] })),
      ]);
      setItems(sched.items || []);
      setSessions(sess.sessions || []);
    } catch (error) {
      console.error("Error loading schedule:", error);
      Toast.show({ type: "error", text1: "Could not load your schedule" });
    } finally {
      setLoading(false);
    }
  }, [view]);

  // Drawer screens stay mounted, so refresh every time this one is focused.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const nowMs = now.getTime();

  const current = items.find(
    (i) =>
      new Date(i.startTime).getTime() <= nowMs &&
      nowMs < new Date(i.endTime).getTime(),
  );
  const next = items.find((i) => new Date(i.startTime).getTime() > nowMs);

  const handleDelete = (item: ScheduleItem) => {
    crossAlert("Remove this class?", `${item.title} will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteScheduleItem(item.id);
            setExpandedId(null);
            load();
          } catch {
            Toast.show({ type: "error", text1: "Could not remove it" });
          }
        },
      },
    ]);
  };

  const renderHeaderCard = () => {
    let heading = "";
    let sub = "";
    let icon: keyof typeof Ionicons.glyphMap = "calendar-outline";

    if (current) {
      icon = "play-circle-outline";
      heading = `${current.title} is happening now`;
      sub = `Until ${fmtTime(new Date(current.endTime))}`;
    } else if (next) {
      icon = "time-outline";
      const start = new Date(next.startTime);
      heading = `Next: ${next.title}`;
      sub = sameDay(start, now)
        ? `Starts in ${fmtCountdown(start.getTime() - nowMs)} (${fmtTime(start)})`
        : `${fmtDay(start)} at ${fmtTime(start)}`;
    } else {
      icon = "checkmark-circle-outline";
      heading = "Nothing else coming up";
      sub = view === "today" ? "You're done for today." : "Your week is clear.";
    }

    return (
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
        }}
        accessibilityRole="summary"
        accessibilityLiveRegion="polite"
      >
        <Ionicons
          name={icon}
          size={34}
          color="#FFFFFF"
          style={{ marginRight: spacing.md }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: "#FFFFFF",
            }}
          >
            {heading}
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: "#FFFFFF",
              marginTop: 2,
            }}
          >
            {sub}
          </Text>
        </View>
      </View>
    );
  };

  const renderCard = (item: ScheduleItem) => {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const isCurrent = current?.id === item.id;
    const isNext = !current && next?.id === item.id;
    const isPast = end.getTime() <= nowMs;
    const isHighlighted = highlightId === item.id;
    const expanded = expandedId === item.id;
    const liveSession = findLiveSession(item, sessions);

    const badge = isCurrent
      ? { text: "Happening now", bg: colors.success }
      : isNext
        ? { text: "Up next", bg: colors.primary }
        : isPast
          ? { text: "Finished", bg: colors.disabled }
          : null;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.9}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.title}, ${fmtTime(start)} to ${fmtTime(end)}${
          badge ? `, ${badge.text}` : ""
        }`}
        style={{
          backgroundColor: colors.surface,
          borderColor:
            isCurrent || isHighlighted ? colors.primary : colors.border,
          borderWidth: isCurrent || isHighlighted ? 3 : 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          opacity: isPast && !isHighlighted ? 0.6 : 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: 22,
              fontWeight: "700",
              color: colors.primary,
            }}
          >
            {fmtTime(start)} – {fmtTime(end)}
          </Text>
          {badge && (
            <View
              style={{
                backgroundColor: badge.bg,
                borderRadius: radius.sm,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}
              >
                {badge.text}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            marginTop: spacing.sm,
          }}
        >
          {item.title}
        </Text>

        {item.subject ? (
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            {item.subject}
          </Text>
        ) : null}

        {liveSession && (
          <TouchableOpacity
            onPress={() =>
              router.push(`/session/${liveSession.id}/live` as any)
            }
            accessibilityRole="button"
            accessibilityLabel={`Join live class ${liveSession.title}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.success,
              borderRadius: radius.md,
              paddingVertical: 14,
              minHeight: 52,
              marginTop: spacing.md,
            }}
          >
            <Ionicons name="mic-outline" size={20} color="#FFFFFF" />
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: typography.button.fontFamily,
                fontSize: typography.button.fontSize,
                fontWeight: "700",
                marginLeft: spacing.sm,
              }}
            >
              Join live class
            </Text>
          </TouchableOpacity>
        )}

        {expanded ? (
          <View style={{ marginTop: spacing.md }}>
            {item.teacherName ? (
              <View style={styles.detailRow}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.text,
                  }}
                >
                  {item.teacherName}
                </Text>
              </View>
            ) : null}
            {item.location ? (
              <View style={styles.detailRow}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.text,
                  }}
                >
                  {item.location}
                </Text>
              </View>
            ) : null}
            {!item.teacherName && !item.location && (
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                }}
              >
                No extra details for this class.
              </Text>
            )}

            <TouchableOpacity
              onPress={() => handleDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.title}`}
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                minHeight: 44,
                marginTop: spacing.sm,
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text
                style={{
                  marginLeft: 6,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "600",
                  color: colors.error,
                }}
              >
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.detailRow, { marginTop: spacing.sm }]}>
            {item.teacherName ? (
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginRight: 12,
                }}
              >
                {item.teacherName}
              </Text>
            ) : null}
            {item.location ? (
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                }}
              >
                {item.location}
              </Text>
            ) : null}
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                fontWeight: "600",
                color: colors.primary,
                marginLeft: "auto",
              }}
            >
              View details
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Week view groups cards under a day heading
  const renderList = () => {
    if (items.length === 0) {
      return (
        <View
          style={{
            alignItems: "center",
            paddingVertical: spacing.xl,
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={40}
            color={colors.textSecondary}
          />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: spacing.sm,
            }}
          >
            {view === "today"
              ? "No classes on your schedule today."
              : "No classes on your schedule this week."}
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
            Tap "Add a class" to build your day.
          </Text>
        </View>
      );
    }

    if (view === "today") return items.map(renderCard);

    const out: React.ReactNode[] = [];
    let lastDay: Date | null = null;
    items.forEach((item) => {
      const d = new Date(item.startTime);
      if (!lastDay || !sameDay(lastDay, d)) {
        out.push(
          <Text
            key={`day-${item.id}`}
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginTop: spacing.sm,
              marginBottom: spacing.sm,
            }}
            accessibilityRole="header"
          >
            {sameDay(d, now) ? "Today" : fmtDay(d)}
          </Text>,
        );
        lastDay = d;
      }
      out.push(renderCard(item));
    });
    return out;
  };

  const toggleButton = (label: string, mode: ViewMode) => {
    const selected = view === mode;
    return (
      <TouchableOpacity
        key={mode}
        onPress={() => {
          setView(mode);
          setLoading(true);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        style={{
          flex: 1,
          paddingVertical: 12,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.md,
          backgroundColor: selected ? colors.primary : "transparent",
        }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: selected ? "#FFFFFF" : colors.textSecondary,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: spacing.md }]}
            onPress={() => router.replace("/student")}
            accessibilityRole="button"
            accessibilityLabel="Back to Student Dashboard"
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.primary,
                fontWeight: "600",
                marginLeft: spacing.sm,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: typography.h2.fontFamily,
              fontSize: typography.h2.fontSize,
              lineHeight: typography.h2.lineHeight,
              fontWeight: typography.h2.fontWeight,
              color: colors.text,
              marginBottom: 4,
            }}
            accessibilityRole="header"
          >
            My Schedule
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginBottom: spacing.lg,
            }}
          >
            {fmtDay(now)}
          </Text>

          {!loading && renderHeaderCard()}

          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.secondaryBackground,
              borderRadius: radius.md,
              padding: 4,
              marginBottom: spacing.lg,
            }}
            accessibilityRole="tablist"
          >
            {toggleButton("Today", "today")}
            {toggleButton("This week", "week")}
          </View>

          {showForm ? (
            <AddItemForm
              onSaved={() => {
                setShowForm(false);
                load();
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              accessibilityRole="button"
              accessibilityLabel="Add a class"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingVertical: 14,
                minHeight: 52,
                marginBottom: spacing.lg,
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: typography.button.fontFamily,
                  fontSize: typography.button.fontSize,
                  fontWeight: "700",
                  marginLeft: 8,
                }}
              >
                Add a class
              </Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: spacing.lg }}
            />
          ) : (
            renderList()
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
});
