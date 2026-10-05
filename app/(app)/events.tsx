// app/(app)/events.tsx
//
// Campus Events.
//   Student:  upcoming events with accessibility tags, "Add to my calendar".
//   Guidance: create events (with tags) and cancel them.
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

import {
    DateField,
    TimeField,
    todayString,
} from "../../components/DateTimePicker";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
    CampusEvent,
    EventTag,
    addEventToCalendar,
    cancelEvent,
    createEvent,
    getEvents,
    removeEventFromCalendar,
} from "../../utils/campusApi";
import { crossAlert } from "../../utils/crossAlert";

const TAG_META: Record<
  EventTag,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  wheelchair_accessible: {
    label: "Wheelchair accessible",
    icon: "accessibility-outline",
  },
  captions: { label: "Captions", icon: "chatbox-ellipses-outline" },
  quiet_area: { label: "Quiet area", icon: "volume-mute-outline" },
  accessible_restroom: {
    label: "Accessible restroom",
    icon: "male-female-outline",
  },
  accessible_seating: { label: "Accessible seating", icon: "people-outline" },
  audio_announcements: {
    label: "Audio announcements",
    icon: "megaphone-outline",
  },
};

const TAG_KEYS = Object.keys(TAG_META) as EventTag[];

// mysql may send "YYYY-MM-DD HH:MM:SS" or an ISO string; handle both.
function parseDate(value: string) {
  const s = String(value);
  return new Date(
    /^\d{4}-\d{2}-\d{2} \d{2}:/.test(s) ? s.replace(" ", "T") : s,
  );
}

function fmtDay(d: Date) {
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();

  const isGuidance = user?.role === "guidance" || user?.role === "admin";
  const isStudent = user?.role === "student";
  const highlightId = highlight ? Number(highlight) : null;

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Guidance form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tags, setTags] = useState<EventTag[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await getEvents());
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not load events",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setTags([]);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (title.trim().length < 3) {
      Toast.show({ type: "error", text1: "Add an event title." });
      return;
    }
    if (location.trim().length < 2) {
      Toast.show({ type: "error", text1: "Add the location." });
      return;
    }
    if (!date || !startTime || !endTime) {
      Toast.show({
        type: "error",
        text1: "Pick the date, start time and end time.",
      });
      return;
    }
    if (endTime <= startTime) {
      Toast.show({
        type: "error",
        text1: "End time must be after the start time.",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await createEvent({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date,
        startTime,
        endTime,
        tags,
      });
      Toast.show({
        type: "success",
        text1: "Event created",
        text2: `Sent to ${res.recipientCount} student${res.recipientCount === 1 ? "" : "s"}.`,
      });
      resetForm();
      await load();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not create the event",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (ev: CampusEvent) => {
    crossAlert(
      "Cancel this event?",
      "It will be removed from students' calendars and they will be notified.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel event",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelEvent(ev.id);
              await load();
            } catch (err: any) {
              Toast.show({
                type: "error",
                text1: "Could not cancel the event",
                text2: err.response?.data?.message ?? "Please try again.",
              });
            }
          },
        },
      ],
    );
  };

  const toggleCalendar = async (ev: CampusEvent) => {
    setBusyId(ev.id);
    try {
      if (ev.inCalendar) {
        await removeEventFromCalendar(ev.id);
        Toast.show({ type: "success", text1: "Removed from your calendar" });
      } else {
        await addEventToCalendar(ev.id);
        Toast.show({ type: "success", text1: "Added to your calendar" });
      }
      await load();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not update your calendar",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

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
    fontWeight: "700" as const,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.sm,
  };

  const renderForm = () => (
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
        }}
        accessibilityRole="header"
      >
        New campus event
      </Text>

      <Text style={labelStyle}>TITLE *</Text>
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Career Fair 2026"
        placeholderTextColor={colors.placeholder}
        maxLength={150}
        accessibilityLabel="Event title"
      />

      <Text style={labelStyle}>DESCRIPTION (OPTIONAL)</Text>
      <TextInput
        style={[inputStyle, { minHeight: 90 }]}
        value={description}
        onChangeText={setDescription}
        placeholder="What is this event about?"
        placeholderTextColor={colors.placeholder}
        multiline
        maxLength={1000}
        textAlignVertical="top"
        accessibilityLabel="Event description"
      />

      <Text style={labelStyle}>LOCATION *</Text>
      <TextInput
        style={inputStyle}
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Student Center"
        placeholderTextColor={colors.placeholder}
        maxLength={150}
        accessibilityLabel="Event location"
      />

      <Text style={labelStyle}>DATE AND TIME *</Text>
      <DateField
        value={date}
        onChange={setDate}
        label="Event date"
        placeholder="Pick a date"
        minDate={todayString()}
      />
      <TimeField
        value={startTime}
        onChange={setStartTime}
        label="Start time"
        placeholder="Pick the start time"
      />
      <TimeField
        value={endTime}
        onChange={setEndTime}
        label="End time"
        placeholder="Pick the end time"
      />

      <Text style={labelStyle}>ACCESSIBILITY INFORMATION</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TAG_KEYS.map((k) => {
          const on = tags.includes(k);
          return (
            <TouchableOpacity
              key={k}
              onPress={() =>
                setTags((prev) =>
                  prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k],
                )
              }
              accessibilityRole="checkbox"
              accessibilityLabel={TAG_META[k].label}
              accessibilityState={{ checked: on }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                minHeight: 44,
                paddingHorizontal: 12,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: on ? colors.primary : colors.border,
                backgroundColor: on ? colors.primary : colors.surface,
              }}
            >
              <Ionicons
                name={on ? "checkmark-circle" : TAG_META[k].icon}
                size={18}
                color={on ? "#FFFFFF" : colors.textSecondary}
              />
              <Text
                style={{
                  marginLeft: 6,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: on ? "#FFFFFF" : colors.text,
                }}
              >
                {TAG_META[k].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={handleCreate}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Create event"
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
          opacity: saving ? 0.6 : 1,
          marginTop: spacing.lg,
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
            Create event
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={resetForm}
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

  const renderEvent = (ev: CampusEvent) => {
    const start = parseDate(ev.startTime);
    const end = parseDate(ev.endTime);
    const cancelled = ev.status === "cancelled";
    const isHighlighted = highlightId === ev.id;
    const busy = busyId === ev.id;

    return (
      <View
        key={ev.id}
        style={{
          backgroundColor: colors.surface,
          borderColor: isHighlighted ? colors.primary : colors.border,
          borderWidth: isHighlighted ? 3 : 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          opacity: cancelled ? 0.6 : 1,
        }}
      >
        {cancelled ? (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.error,
              borderRadius: radius.sm,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginBottom: spacing.sm,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>
              Cancelled
            </Text>
          </View>
        ) : null}

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          {ev.title}
        </Text>

        <View style={[styles.row, { marginTop: spacing.sm }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text
            style={{
              marginLeft: 8,
              flex: 1,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            {fmtDay(start)}, {fmtTime(start)} – {fmtTime(end)}
          </Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text
            style={{
              marginLeft: 8,
              flex: 1,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
            }}
          >
            {ev.location}
          </Text>
        </View>

        {ev.description ? (
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.textSecondary,
              marginTop: spacing.sm,
            }}
          >
            {ev.description}
          </Text>
        ) : null}

        {ev.tags.length > 0 ? (
          <View style={{ marginTop: spacing.md }}>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                fontWeight: "700",
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              ACCESSIBILITY
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ev.tags.map((t) => (
                <View
                  key={t}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: colors.primaryLight + "1A",
                  }}
                >
                  <Ionicons
                    name={TAG_META[t]?.icon ?? "checkmark-circle-outline"}
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.caption.fontSize,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {TAG_META[t]?.label ?? t}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: spacing.sm,
            }}
          >
            No accessibility information listed for this event.
          </Text>
        )}

        {isStudent && !cancelled ? (
          <TouchableOpacity
            onPress={() => toggleCalendar(ev)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={
              ev.inCalendar
                ? `Remove ${ev.title} from my calendar`
                : `Add ${ev.title} to my calendar`
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 52,
              borderRadius: radius.md,
              marginTop: spacing.md,
              opacity: busy ? 0.6 : 1,
              backgroundColor: ev.inCalendar ? "transparent" : colors.primary,
              borderWidth: ev.inCalendar ? 1 : 0,
              borderColor: colors.primary,
            }}
          >
            {busy ? (
              <ActivityIndicator
                color={ev.inCalendar ? colors.primary : "#FFFFFF"}
              />
            ) : (
              <>
                <Ionicons
                  name={
                    ev.inCalendar ? "checkmark-circle" : "add-circle-outline"
                  }
                  size={20}
                  color={ev.inCalendar ? colors.primary : "#FFFFFF"}
                />
                <Text
                  style={{
                    marginLeft: spacing.sm,
                    fontFamily: typography.button.fontFamily,
                    fontSize: typography.button.fontSize,
                    fontWeight: "700",
                    color: ev.inCalendar ? colors.primary : "#FFFFFF",
                  }}
                >
                  {ev.inCalendar
                    ? "On my calendar · Remove"
                    : "Add to my calendar"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {isGuidance && !cancelled ? (
          <TouchableOpacity
            onPress={() => handleCancel(ev)}
            accessibilityRole="button"
            accessibilityLabel={`Cancel ${ev.title}`}
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              minHeight: 44,
              marginTop: spacing.sm,
            }}
          >
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={colors.error}
            />
            <Text
              style={{
                marginLeft: 6,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "700",
                color: colors.error,
              }}
            >
              Cancel event
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
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
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: spacing.md }]}
            onPress={() =>
              router.replace(isGuidance ? "/guidance-dashboard" : "/student")
            }
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
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
            Campus Events
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginBottom: spacing.lg,
            }}
          >
            {isGuidance
              ? "Create events and tell students how accessible they are."
              : "See what is happening on campus and how accessible it is."}
          </Text>

          {isGuidance ? (
            showForm ? (
              renderForm()
            ) : (
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                accessibilityRole="button"
                accessibilityLabel="Create an event"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: colors.primary,
                  borderWidth: 1,
                  borderRadius: radius.md,
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
                    marginLeft: 8,
                    fontFamily: typography.button.fontFamily,
                    fontSize: typography.button.fontSize,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  Create an event
                </Text>
              </TouchableOpacity>
            )
          ) : null}

          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: spacing.lg }}
            />
          ) : events.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
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
                No upcoming events yet.
              </Text>
            </View>
          ) : (
            events.map(renderEvent)
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
});
